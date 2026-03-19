'use client'

import { useState } from 'react'
import Link from 'next/link'

type MarketRow = {
  id: string
  name: string
  slug: string
  type: string | null
  county: string | null
  status: string | null
  permit_required: boolean | null
  last_verified: string | null
}

type Props = {
  markets: MarketRow[]
  stateAbbr: string
  statusFilter: string | null
}

const STATUS_BADGE: Record<string, string> = {
  Unrestricted: 'bg-emerald-100 text-emerald-800',
  'Permit Required': 'bg-amber-100 text-amber-800',
  Prohibited: 'bg-red-100 text-red-800',
  'No Local Rules': 'bg-[var(--off)] text-[var(--slate)]',
}

const STATUS_KEY_MAP: Record<string, string> = {
  unrestricted: 'Unrestricted',
  permitRequired: 'Permit Required',
  prohibited: 'Prohibited',
  noLocalRules: 'No Local Rules',
}

export default function MarketTable({ markets, stateAbbr, statusFilter }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const types = [...new Set(markets.map(m => m.type).filter(Boolean))] as string[]

  const filtered = markets.filter(m => {
    if (statusFilter && m.status !== STATUS_KEY_MAP[statusFilter]) return false
    if (typeFilter && m.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return m.name.toLowerCase().includes(q) || (m.county?.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div>
      {/* Search + Type filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search markets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-[var(--rule)] rounded-lg text-sm font-[family-name:var(--font-body)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium font-[family-name:var(--font-mono)] transition-colors ${
              !typeFilter ? 'bg-[var(--navy)] text-white' : 'bg-[var(--off)] text-[var(--slate)] hover:bg-[var(--rule)]'
            }`}
          >
            All Types
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium font-[family-name:var(--font-mono)] transition-colors ${
                typeFilter === t ? 'bg-[var(--navy)] text-white' : 'bg-[var(--off)] text-[var(--slate)] hover:bg-[var(--rule)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-[var(--muted)] font-[family-name:var(--font-body)] mb-3">
        Showing {filtered.length} of {markets.length} markets
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--rule)]">
        <table className="w-full text-sm font-[family-name:var(--font-body)]">
          <thead className="bg-[var(--off)] text-[var(--slate)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Market</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Type</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell font-[family-name:var(--font-mono)] text-xs">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rule)]/50">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-[var(--off)]/50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/regulations/${stateAbbr.toLowerCase()}/${m.slug}`}
                    className="text-[var(--navy)] font-medium hover:text-[var(--ocean)] hover:underline"
                  >
                    {m.name}
                  </Link>
                  {m.county && <span className="text-[var(--muted)] text-xs ml-2">{m.county} County</span>}
                </td>
                <td className="px-4 py-3 text-[var(--slate)] hidden sm:table-cell">{m.type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[m.status || ''] || 'bg-[var(--off)] text-[var(--slate)]'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)] text-xs font-[family-name:var(--font-mono)] hidden md:table-cell">{m.last_verified}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                  No markets match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
