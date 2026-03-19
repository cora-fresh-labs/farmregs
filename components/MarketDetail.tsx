import type { Market } from '@/lib/supabase'

type Props = {
  market: Market
}

type Section = {
  key: keyof Market
  title: string
}

const SECTIONS: Section[] = [
  { key: 'fsma', title: 'FSMA Produce Safety' },
  { key: 'sales_threshold', title: 'Sales Thresholds' },
  { key: 'cottage_food', title: 'Cottage Food' },
  { key: 'permits', title: 'Permits & Licensing' },
  { key: 'zoning', title: 'Zoning' },
  { key: 'labeling', title: 'Labeling Requirements' },
  { key: 'organic', title: 'Organic Certification' },
  { key: 'pesticides', title: 'Pesticide Regulations' },
  { key: 'water', title: 'Water Regulations' },
  { key: 'direct_sales', title: 'Direct Sales Channels' },
  { key: 'tax', title: 'Tax & Exemptions' },
]

function SectionCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const details = data.details as string | undefined
  const status = data.status as string | undefined
  const entries = Object.entries(data).filter(([k]) => k !== 'details' && k !== 'status')

  return (
    <div className="bg-white rounded-lg border border-[var(--rule)] p-5">
      <h3 className="font-[family-name:var(--font-body)] font-bold text-[var(--navy)] mb-3 flex items-center gap-2">
        <span>{title}</span>
        {status && (
          <span className="ml-auto text-xs font-medium font-[family-name:var(--font-mono)] px-2 py-0.5 rounded bg-[var(--ocean)]/10 text-[var(--ocean)]">
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
                <dt className="text-xs text-[var(--muted)] uppercase tracking-wide font-[family-name:var(--font-mono)]">{label}</dt>
                <dd className="text-sm text-[var(--ink)] font-[family-name:var(--font-body)]">{display}</dd>
              </div>
            )
          })}
        </div>
      )}

      {/* Details paragraph */}
      {details && <p className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)] leading-relaxed">{details}</p>}
    </div>
  )
}

export default function MarketDetail({ market }: Props) {
  return (
    <div className="space-y-4">
      {SECTIONS.map(s => {
        const data = market[s.key] as Record<string, unknown> | null
        if (!data) return null
        return <SectionCard key={s.key} title={s.title} data={data} />
      })}

      {/* Official URLs */}
      {market.official_urls && market.official_urls.length > 0 && (
        <div className="bg-white rounded-lg border border-[var(--rule)] p-5">
          <h3 className="font-[family-name:var(--font-body)] font-bold text-[var(--navy)] mb-3">
            Official Resources
          </h3>
          <ul className="space-y-2">
            {market.official_urls.map((u, i) => (
              <li key={i}>
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]"
                >
                  {u.label} &rarr;
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
