'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FarmRegulation, FarmProfile } from '@/lib/supabase'
import ChatWidget from '@/components/ChatWidget'

function RegulationsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email')
  const highlightId = searchParams.get('id')

  const [profile, setProfile] = useState<FarmProfile | null>(null)
  const [regulations, setRegulations] = useState<FarmRegulation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ agency: '', category: '', severity: '' })

  useEffect(() => {
    if (!email) { router.push('/'); return }
    fetch(`/api/dashboard?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile) setProfile(d.profile)
        if (d.regulations) setRegulations(d.regulations)
      })
      .finally(() => setLoading(false))
  }, [email, router])

  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        document.getElementById(`reg-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    }
  }, [highlightId, regulations])

  const filtered = regulations.filter(reg => {
    if (filter.agency && reg.agency !== filter.agency) return false
    if (filter.category && reg.category !== filter.category) return false
    if (filter.severity && reg.severity !== filter.severity) return false
    return true
  })

  const recentlyChanged = [...regulations]
    .sort((a, b) => new Date(b.last_changed || 0).getTime() - new Date(a.last_changed || 0).getTime())
    .slice(0, 3)

  const agencies = [...new Set(regulations.map(r => r.agency).filter(Boolean))]
  const categories = [...new Set(regulations.map(r => r.category).filter(Boolean))]

  const severityConfig: Record<string, { label: string; icon: string; cls: string; badgeCls: string }> = {
    critical: { label: 'Critical', icon: '🔴', cls: 'border-red-200 bg-red-50', badgeCls: 'bg-red-100 text-red-700' },
    warning: { label: 'Warning', icon: '⚠️', cls: 'border-amber-200 bg-amber-50', badgeCls: 'bg-amber-100 text-amber-700' },
    info: { label: 'Info', icon: 'ℹ️', cls: 'border-gray-200 bg-white', badgeCls: 'bg-blue-100 text-blue-700' },
  }

  const categoryLabels: Record<string, string> = {
    food_safety: 'Food Safety',
    environmental: 'Environmental',
    labor: 'Labor',
    certification: 'Certification',
    reporting: 'Reporting',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f0]">
      <div className="text-center"><div className="text-5xl animate-bounce mb-4">🌾</div><p className="text-gray-600">Loading regulations...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      <header className="bg-[#1b4332] text-white py-4 px-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <span className="text-xl font-bold">FarmRegs</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href={`/dashboard?email=${encodeURIComponent(email!)}`} className="text-green-200 hover:text-white">Dashboard</Link>
            <Link href={`/documents?email=${encodeURIComponent(email!)}`} className="text-green-200 hover:text-white">Documents</Link>
            <Link href={`/regulations?email=${encodeURIComponent(email!)}`} className="text-white font-medium">Regulations</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Regulations</h1>
          <p className="text-gray-500 mt-1">
            {profile?.farm_name} — {filtered.length} regulations applicable to your operation
          </p>
        </div>

        {/* Recently Changed */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 What Changed Recently</h2>
          <div className="space-y-3">
            {recentlyChanged.map(reg => (
              <div key={reg.id} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm flex gap-4">
                <div className="text-2xl shrink-0">{severityConfig[reg.severity]?.icon || 'ℹ️'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{reg.title}</span>
                    <span className="text-xs text-gray-400">{reg.agency}</span>
                    {reg.last_changed && (
                      <span className="text-xs text-gray-400">Updated {new Date(reg.last_changed).toLocaleDateString()}</span>
                    )}
                  </div>
                  {reg.change_summary && (
                    <p className="text-sm text-gray-600">{reg.change_summary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filter.agency}
            onChange={e => setFilter(p => ({ ...p, agency: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          >
            <option value="">All Agencies</option>
            {agencies.map(a => <option key={a!} value={a!}>{a}</option>)}
          </select>
          <select
            value={filter.category}
            onChange={e => setFilter(p => ({ ...p, category: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c!} value={c!}>{categoryLabels[c!] || c}</option>)}
          </select>
          <select
            value={filter.severity}
            onChange={e => setFilter(p => ({ ...p, severity: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          {(filter.agency || filter.category || filter.severity) && (
            <button onClick={() => setFilter({ agency: '', category: '', severity: '' })} className="text-sm text-gray-400 hover:text-gray-600">
              Clear filters ×
            </button>
          )}
        </div>

        {/* Regulation Cards */}
        <div className="space-y-4">
          {filtered.map(reg => {
            const cfg = severityConfig[reg.severity] || severityConfig.info
            const isHighlighted = reg.id === highlightId
            return (
              <div
                key={reg.id}
                id={`reg-${reg.id}`}
                className={`rounded-xl p-6 border shadow-sm transition-all ${cfg.cls} ${isHighlighted ? 'ring-2 ring-[#2d6a4f]' : ''}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{cfg.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{reg.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{reg.agency}</span>
                        {reg.state && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{reg.state} only</span>}
                        {reg.category && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{categoryLabels[reg.category] || reg.category}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badgeCls}`}>{cfg.label}</span>
                      </div>
                    </div>
                  </div>
                  {reg.full_url && (
                    <a href={reg.full_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-[#2d6a4f] hover:underline">
                      Official source →
                    </a>
                  )}
                </div>

                {reg.summary && (
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">{reg.summary}</p>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                  {reg.effective_date && <span>Effective: {new Date(reg.effective_date).toLocaleDateString()}</span>}
                  {reg.last_changed && <span>Last updated: {new Date(reg.last_changed).toLocaleDateString()}</span>}
                  {reg.farm_types && <span>Applies to: {reg.farm_types.map(t => t.replace('_', ' ')).join(', ')}</span>}
                </div>

                {reg.change_summary && reg.last_changed && (
                  <div className="mt-4 bg-white/70 rounded-lg p-3 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Recent change:</p>
                    <p className="text-xs text-amber-700">{reg.change_summary}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p>No regulations match your filters.</p>
          </div>
        )}
      </main>

      <ChatWidget email={email!} farmProfile={profile} />
    </div>
  )
}

export default function RegulationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#faf7f0]"><div className="text-5xl animate-bounce">🌾</div></div>}>
      <RegulationsContent />
    </Suspense>
  )
}
