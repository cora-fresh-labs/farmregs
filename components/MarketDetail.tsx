import type { Market } from '@/lib/supabase'

type Props = {
  market: Market
}

type Section = {
  key: keyof Market
  title: string
  icon: string
}

const SECTIONS: Section[] = [
  { key: 'fsma', title: 'FSMA Produce Safety', icon: '🛡️' },
  { key: 'sales_threshold', title: 'Sales Thresholds', icon: '📊' },
  { key: 'cottage_food', title: 'Cottage Food', icon: '🏠' },
  { key: 'permits', title: 'Permits & Licensing', icon: '📋' },
  { key: 'zoning', title: 'Zoning', icon: '🗺️' },
  { key: 'labeling', title: 'Labeling Requirements', icon: '🏷️' },
  { key: 'organic', title: 'Organic Certification', icon: '🌿' },
  { key: 'pesticides', title: 'Pesticide Regulations', icon: '🧪' },
  { key: 'water', title: 'Water Regulations', icon: '💧' },
  { key: 'direct_sales', title: 'Direct Sales Channels', icon: '🛒' },
  { key: 'tax', title: 'Tax & Exemptions', icon: '💰' },
]

function SectionCard({ title, icon, data }: { title: string; icon: string; data: Record<string, unknown> }) {
  const details = data.details as string | undefined
  const status = data.status as string | undefined
  const entries = Object.entries(data).filter(([k]) => k !== 'details' && k !== 'status')

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
        {status && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
            {status}
          </span>
        )}
      </h3>

      {/* Key-value pairs */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {entries.map(([key, val]) => {
            if (val === null || val === undefined) return null
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
            let display: string
            if (Array.isArray(val)) {
              display = val.join(', ')
            } else if (typeof val === 'boolean') {
              display = val ? 'Yes' : 'No'
            } else {
              display = String(val)
            }
            return (
              <div key={key}>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
                <dd className="text-sm text-gray-800">{display}</dd>
              </div>
            )
          })}
        </div>
      )}

      {/* Details paragraph */}
      {details && <p className="text-sm text-gray-600 leading-relaxed">{details}</p>}
    </div>
  )
}

export default function MarketDetail({ market }: Props) {
  return (
    <div className="space-y-4">
      {SECTIONS.map(s => {
        const data = market[s.key] as Record<string, unknown> | null
        if (!data) return null
        return <SectionCard key={s.key} title={s.title} icon={s.icon} data={data} />
      })}

      {/* Official URLs */}
      {market.official_urls && market.official_urls.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🔗</span>
            <span>Official Resources</span>
          </h3>
          <ul className="space-y-2">
            {market.official_urls.map((u, i) => (
              <li key={i}>
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 hover:underline"
                >
                  {u.label} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
