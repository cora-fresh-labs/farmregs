import { NextRequest, NextResponse } from 'next/server'
import {
  verifyCronAuth,
  getCached,
  setCache,
  fetchWithTimeout,
  summarizeChange,
  insertRegulationUpdate,
  createAlertsForState,
} from '@/lib/cron-helpers'
import { supabaseAdmin } from '@/lib/supabase'

const CACHE_KEY = 'state-sync'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days (runs weekly)

// State agriculture department search terms
const STATE_TERMS = [
  'cottage food law',
  'state agriculture department produce',
  'farmers market regulation',
  'state food safety',
  'state organic certification',
]

async function fetchStateUpdates(): Promise<
  { title: string; abstract: string; html_url: string; publication_date: string; state?: string }[]
> {
  const results: { title: string; abstract: string; html_url: string; publication_date: string; state?: string }[] = []

  // Federal Register for state-related agricultural rules
  for (const term of STATE_TERMS) {
    try {
      const url = `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=${encodeURIComponent(term)}&per_page=10&order=newest`
      const res = await fetchWithTimeout(url)
      if (!res.ok) continue

      const data = await res.json()
      for (const doc of data.results || []) {
        const pubDate = new Date(doc.publication_date)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        if (pubDate < thirtyDaysAgo) continue

        results.push({
          title: doc.title,
          abstract: doc.abstract || '',
          html_url: doc.html_url,
          publication_date: doc.publication_date,
        })
      }
    } catch (err) {
      console.error(`State sync error for "${term}":`, err)
    }
  }

  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.html_url)) return false
    seen.add(r.html_url)
    return true
  })
}

// Try to match a regulation to a specific state by looking for state names in the title/abstract
async function matchState(title: string, abstract: string): Promise<string | null> {
  const { data: states } = await supabaseAdmin
    .from('fr_states')
    .select('id, abbr, name')

  if (!states) return null

  const text = `${title} ${abstract}`.toLowerCase()
  for (const s of states) {
    if (text.includes(s.name.toLowerCase())) return s.id
  }
  return null
}

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req)
  if (authErr) return authErr

  const cached = getCached<{ count: number }>(CACHE_KEY, CACHE_TTL)
  if (cached) return NextResponse.json({ ...cached, fromCache: true })

  const updates = await fetchStateUpdates()
  let inserted = 0
  let alertsCreated = 0

  for (const update of updates) {
    const { summary, severity, change_type } = await summarizeChange(
      update.title,
      update.abstract
    )

    const stateId = await matchState(update.title, update.abstract)

    await insertRegulationUpdate({
      state_id: stateId,
      source: 'state_ag_dept',
      title: update.title,
      summary,
      change_type,
      severity,
      source_url: update.html_url,
      effective_date: update.publication_date,
    })
    inserted++

    // Create alerts for farmers in the matched state
    if (stateId && (severity === 'critical' || severity === 'warning')) {
      const { data: state } = await supabaseAdmin
        .from('fr_states')
        .select('abbr')
        .eq('id', stateId)
        .single()

      if (state) {
        alertsCreated += await createAlertsForState(state.abbr, update.title, summary, severity)
      }
    }
  }

  const result = { source: 'state_ag_dept', found: updates.length, inserted, alertsCreated }
  setCache(CACHE_KEY, result)

  return NextResponse.json(result)
}
