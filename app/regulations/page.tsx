'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Header from '@/components/Header'

const USMap = dynamic(() => import('@/components/USMap'), { ssr: false })

type StateItem = {
  id: string
  abbr: string
  name: string
  country: string
  status: string | null
  status_label: string | null
  total_markets: number
  counts: { unrestricted: number; permitRequired: number; prohibited: number; noLocalRules: number }
}

const STATUS_DOT: Record<string, string> = {
  strict: 'bg-red-500',
  moderate: 'bg-amber-500',
  'grower-friendly': 'bg-emerald-500',
  mixed: 'bg-purple-500',
}

export default function RegulationsPage() {
  const router = useRouter()
  const [states, setStates] = useState<StateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/states')
      .then(r => r.json())
      .then(data => { setStates(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search) return states
    const q = search.toLowerCase()
    return states.filter(s => s.name.toLowerCase().includes(q) || s.abbr.toLowerCase().includes(q))
  }, [states, search])

  const totals = useMemo(() => {
    return states.reduce(
      (acc, s) => ({
        states: acc.states + 1,
        markets: acc.markets + s.total_markets,
        unrestricted: acc.unrestricted + (s.counts?.unrestricted || 0),
        permitRequired: acc.permitRequired + (s.counts?.permitRequired || 0),
      }),
      { states: 0, markets: 0, unrestricted: 0, permitRequired: 0 }
    )
  }, [states])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🌾</div>
          <p className="text-gray-500">Loading regulations map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">US Produce Regulations by State</h1>
          <p className="text-gray-500 max-w-2xl">
            Click any state to explore local market regulations including FSMA compliance,
            cottage food laws, permits, organic certification, and more.
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totals.states}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">States + DC</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totals.markets.toLocaleString()}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Markets Tracked</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{totals.unrestricted.toLocaleString()}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Unrestricted</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{totals.permitRequired.toLocaleString()}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Permit Required</div>
          </div>
        </div>

        {/* Map + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
            <USMap states={states} onStateClick={(abbr) => router.push(`/regulations/${abbr.toLowerCase()}`)} />
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs text-gray-600">
              {[
                { label: 'Grower-Friendly', color: 'bg-emerald-500' },
                { label: 'Moderate', color: 'bg-amber-500' },
                { label: 'Strict', color: 'bg-red-500' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${l.color}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* State list sidebar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <input
              type="text"
              placeholder="Search states..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="max-h-[420px] overflow-y-auto space-y-1">
              {filtered.map(s => (
                <Link
                  key={s.abbr}
                  href={`/regulations/${s.abbr.toLowerCase()}`}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-green-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s.status || ''] || 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-800 group-hover:text-green-800">{s.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{s.total_markets}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
