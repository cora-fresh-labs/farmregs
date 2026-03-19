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

const CACHE_KEY = 'usda-sync'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// USDA FSMA, organic, GAP-related search terms
const SEARCH_TERMS = [
  'FSMA produce safety rule',
  'organic certification USDA',
  'Good Agricultural Practices',
  'food safety modernization act',
  'agricultural water testing',
]

// Federal Register API for USDA rules
async function fetchUSDAUpdates(): Promise<
  { title: string; abstract: string; html_url: string; publication_date: string; agencies: string[] }[]
> {
  const results: { title: string; abstract: string; html_url: string; publication_date: string; agencies: string[] }[] = []

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=${encodeURIComponent(term)}&conditions%5Bagencies%5D%5B%5D=agriculture-department&per_page=5&order=newest`
      const res = await fetchWithTimeout(url)
      if (!res.ok) continue

      const data = await res.json()
      for (const doc of data.results || []) {
        // Only include docs from the last 30 days
        const pubDate = new Date(doc.publication_date)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        if (pubDate < thirtyDaysAgo) continue

        results.push({
          title: doc.title,
          abstract: doc.abstract || '',
          html_url: doc.html_url,
          publication_date: doc.publication_date,
          agencies: (doc.agencies || []).map((a: { name: string }) => a.name),
        })
      }
    } catch (err) {
      console.error(`USDA fetch error for "${term}":`, err)
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.html_url)) return false
    seen.add(r.html_url)
    return true
  })
}

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req)
  if (authErr) return authErr

  // Check cache
  const cached = getCached<{ count: number }>(CACHE_KEY, CACHE_TTL)
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  const updates = await fetchUSDAUpdates()
  let inserted = 0
  let alertsCreated = 0

  for (const update of updates) {
    // AI summarization
    const { summary, severity, change_type } = await summarizeChange(
      update.title,
      update.abstract
    )

    await insertRegulationUpdate({
      source: 'USDA',
      title: update.title,
      summary,
      change_type,
      severity,
      source_url: update.html_url,
      effective_date: update.publication_date,
    })
    inserted++

    // Create alerts for all farmers if critical
    if (severity === 'critical' || severity === 'warning') {
      alertsCreated += await createAlertsForState('ALL', update.title, summary, severity)
    }
  }

  const result = { source: 'USDA', found: updates.length, inserted, alertsCreated }
  setCache(CACHE_KEY, result)

  return NextResponse.json(result)
}
