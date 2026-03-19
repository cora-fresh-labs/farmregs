'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import StatCards from '@/components/StatCards'
import MarketTable from '@/components/MarketTable'

type StateData = {
  id: string
  abbr: string
  name: string
  status: string | null
  status_label: string | null
  summary: string | null
  total_markets: number
  counts: { unrestricted: number; permitRequired: number; prohibited: number; noLocalRules: number }
  markets: {
    id: string
    name: string
    slug: string
    type: string | null
    county: string | null
    status: string | null
    permit_required: boolean | null
    last_verified: string | null
  }[]
}

const STATUS_STYLE: Record<string, string> = {
  strict: 'bg-red-100 text-red-800 border-red-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  'grower-friendly': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  mixed: 'bg-purple-100 text-purple-800 border-purple-200',
}

export default function StatePage() {
  const params = useParams<{ state: string }>()
  const abbr = params.state?.toUpperCase() || ''
  const [data, setData] = useState<StateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!abbr) return
    fetch(`/api/states/${abbr}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [abbr])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🌾</div>
          <p className="text-gray-500">Loading state data...</p>
        </div>
      </div>
    )
  }

  if (!data || !data.name) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">State not found.</p>
          <Link href="/regulations" className="text-green-700 hover:underline">Back to map</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb crumbs={[
          { label: 'Regulations', href: '/regulations' },
          { label: data.name },
        ]} />

        {/* State hero */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
            {data.status_label && (
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${STATUS_STYLE[data.status || ''] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {data.status_label}
              </span>
            )}
          </div>
          {data.summary && (
            <p className="text-gray-600 leading-relaxed max-w-3xl">{data.summary}</p>
          )}
        </div>

        {/* Stat cards */}
        <div className="mb-6">
          <StatCards
            counts={data.counts}
            activeFilter={statusFilter}
            onFilter={setStatusFilter}
          />
        </div>

        {/* Markets table */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Markets in {data.name}
            <span className="text-gray-400 font-normal text-sm ml-2">({data.total_markets})</span>
          </h2>
          <MarketTable
            markets={data.markets || []}
            stateAbbr={abbr.toLowerCase()}
            statusFilter={statusFilter}
          />
        </div>
      </main>
    </div>
  )
}
