'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import MarketDetail from '@/components/MarketDetail'
import QuickFacts from '@/components/QuickFacts'
import { useUser } from '@/lib/hooks/useUser'
import type { Market } from '@/lib/supabase'

type MarketWithState = Market & {
  state: { abbr: string; name: string }
}

const STATUS_STYLE: Record<string, string> = {
  Unrestricted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Permit Required': 'bg-amber-100 text-amber-800 border-amber-200',
  Prohibited: 'bg-red-100 text-red-800 border-red-200',
  'No Local Rules': 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function MarketPage() {
  const params = useParams<{ state: string; market: string }>()
  const { user } = useUser()
  const [data, setData] = useState<MarketWithState | null>(null)
  const [loading, setLoading] = useState(true)
  const [pinning, setPinning] = useState(false)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    if (!params.market) return
    fetch(`/api/markets/${params.market}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.market])

  const handlePin = async () => {
    if (!data || pinning) return
    setPinning(true)
    try {
      const res = await fetch('/api/profile/pin-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: data.id }),
      })
      if (res.ok) setPinned(true)
    } finally {
      setPinning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🌾</div>
          <p className="text-gray-500">Loading market data...</p>
        </div>
      </div>
    )
  }

  if (!data || !data.name) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Market not found.</p>
          <Link href="/regulations" className="text-green-700 hover:underline">Back to map</Link>
        </div>
      </div>
    )
  }

  const stateAbbr = data.state?.abbr || params.state?.toUpperCase() || ''
  const stateName = data.state?.name || stateAbbr

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb crumbs={[
          { label: 'Regulations', href: '/regulations' },
          { label: stateName, href: `/regulations/${stateAbbr.toLowerCase()}` },
          { label: data.name },
        ]} />

        {/* Market hero */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
            {data.status && (
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${STATUS_STYLE[data.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {data.status}
              </span>
            )}
            {pinned && (
              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                Your Market
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {data.type && <span>{data.type}</span>}
            {data.county && <span>· {data.county} County</span>}
            {data.last_verified && <span>· Last verified: {data.last_verified}</span>}
            {user && !pinned && (
              <button
                onClick={handlePin}
                disabled={pinning}
                className="ml-auto bg-[#2d6a4f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1b4332] disabled:opacity-50 transition-colors"
              >
                {pinning ? 'Pinning...' : 'This is my market'}
              </button>
            )}
          </div>
        </div>

        {/* Two-column layout: detail + quick facts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MarketDetail market={data} />
          </div>
          <div>
            <QuickFacts market={data} />
          </div>
        </div>
      </main>
    </div>
  )
}
