import type { Market } from '@/lib/supabase'

type Props = {
  market: Market
}

export default function QuickFacts({ market }: Props) {
  const facts: { label: string; value: string | null }[] = [
    { label: 'Status', value: market.status },
    { label: 'Permit Required', value: market.permit_required === true ? 'Yes' : market.permit_required === false ? 'No' : null },
    { label: 'Type', value: market.type },
    { label: 'County', value: market.county },
    { label: 'FSMA', value: market.fsma?.status as string || null },
    { label: 'Cottage Food Cap', value: market.cottage_food?.revenueCap as string || null },
    { label: 'Organic Cert Required', value: market.organic?.required === true ? 'Yes' : market.organic?.required === false ? 'No' : null },
    { label: 'Sales Tax Exempt', value: market.tax?.salesTaxExempt === true ? 'Yes' : market.tax?.salesTaxExempt === false ? 'No' : null },
    { label: 'Last Verified', value: market.last_verified },
  ]

  return (
    <div className="bg-white rounded-lg border border-[var(--rule)] p-5 sticky top-4">
      <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)] mb-4">Quick Facts</h3>
      <dl className="space-y-3">
        {facts.map(f => f.value ? (
          <div key={f.label}>
            <dt className="text-xs text-[var(--muted)] uppercase tracking-wide font-[family-name:var(--font-mono)]">{f.label}</dt>
            <dd className="text-sm font-medium text-[var(--ink)] font-[family-name:var(--font-body)] mt-0.5">{f.value}</dd>
          </div>
        ) : null)}
      </dl>
    </div>
  )
}
