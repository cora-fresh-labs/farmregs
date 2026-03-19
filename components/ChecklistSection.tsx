'use client'

import { useState } from 'react'

type ChecklistItem = {
  id: string
  section: string
  title: string
  description: string | null
  priority: string
  is_checked: boolean
}

type Props = {
  items: ChecklistItem[]
  onToggle: (id: string, checked: boolean) => void
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

const SECTION_LABELS: Record<string, string> = {
  fsma: 'FSMA',
  permits: 'Permits',
  cottage_food: 'Cottage Food',
  organic: 'Organic',
  pesticides: 'Pesticides',
  water: 'Water',
  zoning: 'Zoning',
  labeling: 'Labeling',
  tax: 'Tax',
  direct_sales: 'Direct Sales',
  sales_threshold: 'Sales Threshold',
}

export default function ChecklistSection({ items, onToggle }: Props) {
  const [regenerating, setRegenerating] = useState(false)

  const checked = items.filter(i => i.is_checked).length
  const total = items.length
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  const handleToggle = async (item: ChecklistItem) => {
    const newChecked = !item.is_checked
    onToggle(item.id, newChecked)

    await fetch('/api/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_checked: newChecked }),
    })
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await fetch('/api/checklist/generate', { method: 'POST' })
      window.location.reload()
    } finally {
      setRegenerating(false)
    }
  }

  // Group by section
  const sections = new Map<string, ChecklistItem[]>()
  for (const item of items) {
    const group = sections.get(item.section) || []
    group.push(item)
    sections.set(item.section, group)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Compliance Checklist</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{checked}/{total} complete</span>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs text-[#2d6a4f] hover:underline disabled:opacity-50"
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626',
          }}
        />
      </div>

      {/* Items grouped by section */}
      <div className="space-y-4">
        {Array.from(sections.entries()).map(([section, sectionItems]) => (
          <div key={section} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">{SECTION_LABELS[section] || section}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {sectionItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-green-50/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggle(item)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2d6a4f] focus:ring-[#2d6a4f]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.is_checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.title}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.medium}`}>
                        {item.priority}
                      </span>
                    </div>
                    {item.description && (
                      <p className={`text-xs mt-0.5 ${item.is_checked ? 'text-gray-300' : 'text-gray-500'}`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
