type RegSection = Record<string, unknown>

type MarketData = {
  fsma?: RegSection | null
  sales_threshold?: RegSection | null
  cottage_food?: RegSection | null
  permits?: RegSection | null
  zoning?: RegSection | null
  labeling?: RegSection | null
  organic?: RegSection | null
  pesticides?: RegSection | null
  water?: RegSection | null
  direct_sales?: RegSection | null
  tax?: RegSection | null
}

type FarmData = {
  farm_type?: string[] | null
}

type ChecklistItem = {
  section: string
  title: string
  description: string | null
  priority: string
}

export function generateChecklist(market: MarketData, farm: FarmData): ChecklistItem[] {
  const items: ChecklistItem[] = []

  // FSMA
  if (market.fsma) {
    const status = String(market.fsma.status || '').toLowerCase()
    if (status.includes('covered') || status.includes('full')) {
      items.push({
        section: 'fsma',
        title: 'FSMA Produce Safety: You are COVERED',
        description: String(market.fsma.details || 'Verify full compliance with FDA Produce Safety Rule requirements.'),
        priority: 'high',
      })
    } else if (status.includes('exempt') || status.includes('qualified')) {
      items.push({
        section: 'fsma',
        title: 'FSMA: Qualified Exempt — maintain records',
        description: String(market.fsma.details || 'Keep documentation proving qualified exemption status. Must maintain records.'),
        priority: 'medium',
      })
    } else if (market.fsma.details) {
      items.push({
        section: 'fsma',
        title: 'FSMA Compliance: Review your status',
        description: String(market.fsma.details),
        priority: 'medium',
      })
    }
  }

  // Permits
  if (market.permits) {
    const types = market.permits.types
    if (Array.isArray(types)) {
      for (const permit of types) {
        items.push({
          section: 'permits',
          title: `Obtain: ${String(permit)}`,
          description: String(market.permits.details || 'Check local requirements for this permit type.'),
          priority: 'high',
        })
      }
    } else if (market.permits.details) {
      items.push({
        section: 'permits',
        title: 'Permits: Review requirements',
        description: String(market.permits.details),
        priority: 'high',
      })
    }
  }

  // Cottage Food
  if (market.cottage_food) {
    const allowed = market.cottage_food.allowed
    const cap = market.cottage_food.revenueCap || market.cottage_food.cap
    items.push({
      section: 'cottage_food',
      title: `Cottage Food: ${allowed ? 'Allowed' : 'Not allowed'}${cap ? ` (cap: ${cap})` : ''}`,
      description: String(market.cottage_food.details || 'Review cottage food law requirements for your area.'),
      priority: 'medium',
    })
  }

  // Organic — only if farmer is organic
  const isOrganic = farm.farm_type?.includes('organic')
  if (market.organic && isOrganic) {
    const required = market.organic.required
    items.push({
      section: 'organic',
      title: `Organic Certification: ${required ? 'Required' : 'Review requirements'}`,
      description: String(market.organic.details || 'USDA organic certification requirements apply.'),
      priority: 'high',
    })
  }

  // Pesticides
  if (market.pesticides && market.pesticides.details) {
    items.push({
      section: 'pesticides',
      title: 'Pesticide Compliance: Review requirements',
      description: String(market.pesticides.details),
      priority: 'medium',
    })
  }

  // Water
  if (market.water && market.water.details) {
    items.push({
      section: 'water',
      title: 'Water Regulations: Review requirements',
      description: String(market.water.details),
      priority: 'medium',
    })
  }

  // Zoning
  if (market.zoning && market.zoning.details) {
    items.push({
      section: 'zoning',
      title: 'Zoning: Verify farm sales permitted',
      description: String(market.zoning.details),
      priority: 'medium',
    })
  }

  // Labeling
  if (market.labeling && market.labeling.details) {
    items.push({
      section: 'labeling',
      title: 'Labeling: Meet requirements',
      description: String(market.labeling.details),
      priority: 'medium',
    })
  }

  // Tax
  if (market.tax) {
    const exempt = market.tax.salesTaxExempt
    items.push({
      section: 'tax',
      title: exempt ? 'Sales Tax: Exempt' : 'Sales Tax: May apply — verify',
      description: String(market.tax.details || 'Check local sales tax requirements for farm products.'),
      priority: exempt ? 'low' : 'medium',
    })
  }

  // Direct Sales
  if (market.direct_sales) {
    const channels = market.direct_sales.channels
    items.push({
      section: 'direct_sales',
      title: `Direct Sales: ${Array.isArray(channels) ? channels.join(', ') : 'Review channels'}`,
      description: String(market.direct_sales.details || 'Review permitted direct-to-consumer sales channels.'),
      priority: 'low',
    })
  }

  // Sales Threshold
  if (market.sales_threshold) {
    const federal = market.sales_threshold.federal
    const state = market.sales_threshold.state
    items.push({
      section: 'sales_threshold',
      title: `Sales Thresholds: Federal ${federal || 'N/A'}, State ${state || 'N/A'}`,
      description: String(market.sales_threshold.details || 'Review sales threshold requirements that affect compliance obligations.'),
      priority: 'medium',
    })
  }

  // Sort by priority: high -> medium -> low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  items.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1))

  return items
}
