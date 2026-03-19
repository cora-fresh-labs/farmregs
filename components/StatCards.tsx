'use client'

type StatCardsProps = {
  counts: {
    unrestricted: number
    permitRequired: number
    prohibited: number
    noLocalRules: number
  }
  activeFilter: string | null
  onFilter: (filter: string | null) => void
}

const CARDS = [
  { key: 'unrestricted', label: 'Unrestricted', color: 'bg-emerald-50 border-emerald-300 text-emerald-800', dot: 'bg-emerald-500' },
  { key: 'permitRequired', label: 'Permit Required', color: 'bg-amber-50 border-amber-300 text-amber-800', dot: 'bg-amber-500' },
  { key: 'prohibited', label: 'Prohibited', color: 'bg-red-50 border-red-300 text-red-800', dot: 'bg-red-500' },
  { key: 'noLocalRules', label: 'No Local Rules', color: 'bg-gray-50 border-gray-300 text-gray-700', dot: 'bg-gray-400' },
] as const

export default function StatCards({ counts, activeFilter, onFilter }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARDS.map(card => {
        const count = counts[card.key] ?? 0
        const isActive = activeFilter === card.key
        return (
          <button
            key={card.key}
            onClick={() => onFilter(isActive ? null : card.key)}
            className={`rounded-lg border p-4 text-left transition-all cursor-pointer ${card.color} ${
              isActive ? 'ring-2 ring-offset-1 ring-green-600 shadow-md' : 'hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${card.dot}`} />
              <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
            </div>
            <div className="text-2xl font-bold">{count}</div>
          </button>
        )
      })}
    </div>
  )
}
