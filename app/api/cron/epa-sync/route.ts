import { NextRequest, NextResponse } from 'next/server'
import {
  verifyCronAuth,
  getCached,
  setCache,
  fetchWithTimeout,
  summarizeChange,
  insertRegulationUpdate,
} from '@/lib/cron-helpers'

const CACHE_KEY = 'epa-sync'
const CACHE_TTL = 24 * 60 * 60 * 1000

const SEARCH_TERMS = [
  'pesticide registration agricultural',
  'WOTUS waters of the united states',
  'agricultural water quality',
  'NPDES concentrated animal feeding',
  'pesticide applicator certification',
]

async function fetchEPAUpdates(): Promise<
  { title: string; abstract: string; html_url: string; publication_date: string }[]
> {
  const results: { title: string; abstract: string; html_url: string; publication_date: string }[] = []

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=${encodeURIComponent(term)}&conditions%5Bagencies%5D%5B%5D=environmental-protection-agency&per_page=5&order=newest`
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
      console.error(`EPA fetch error for "${term}":`, err)
    }
  }

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

  const cached = getCached<{ count: number }>(CACHE_KEY, CACHE_TTL)
  if (cached) return NextResponse.json({ ...cached, fromCache: true })

  const updates = await fetchEPAUpdates()
  let inserted = 0

  for (const update of updates) {
    const { summary, severity, change_type } = await summarizeChange(
      update.title,
      update.abstract
    )

    await insertRegulationUpdate({
      source: 'EPA',
      title: update.title,
      summary,
      change_type,
      severity,
      source_url: update.html_url,
      effective_date: update.publication_date,
    })
    inserted++
  }

  const result = { source: 'EPA', found: updates.length, inserted }
  setCache(CACHE_KEY, result)

  return NextResponse.json(result)
}
