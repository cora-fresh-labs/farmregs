import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  )
}

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type FarmProfile = {
  id: string
  email: string
  name: string | null
  farm_name: string | null
  state: string | null
  farm_type: string[] | null
  acreage: number | null
  country: string | null
  commodity: string | null
  plan: string | null
  created_at: string
}

export type FarmDocument = {
  id: string
  farm_id: string
  doc_type: string | null
  doc_name: string | null
  expiry_date: string | null
  issuing_body: string | null
  status: string
  notes: string | null
  created_at: string
}

export type FarmRegulation = {
  id: string
  title: string
  agency: string | null
  state: string | null
  farm_types: string[] | null
  category: string | null
  summary: string | null
  full_url: string | null
  effective_date: string | null
  last_changed: string | null
  change_summary: string | null
  severity: string
  country: string | null
  created_at: string
}

export type FarmAlert = {
  id: string
  farm_id: string
  regulation_id: string | null
  alert_type: string | null
  title: string | null
  description: string | null
  action_required: string | null
  due_date: string | null
  status: string
  created_at: string
}

// --- New deep-regulation types (fr_ tables) ---

export type StateCounts = {
  unrestricted: number
  permitRequired: number
  prohibited: number
  noLocalRules: number
}

export type State = {
  id: string
  abbr: string
  name: string
  country: string
  status: string | null       // 'strict' | 'moderate' | 'grower-friendly' | 'mixed'
  status_label: string | null
  summary: string | null
  total_markets: number
  counts: StateCounts
  created_at: string
  updated_at: string
}

export type OfficialUrl = {
  url: string
  label: string
}

export type RegSection = {
  status?: string
  details?: string
  [key: string]: unknown
}

export type Market = {
  id: string
  state_id: string
  name: string
  slug: string
  type: string | null         // 'City' | 'County' | 'Borough' | 'Census Area' etc.
  county: string | null
  status: string | null       // 'Unrestricted' | 'Permit Required' | 'Prohibited' | 'No Local Rules'
  permit_required: boolean | null
  last_verified: string | null

  // Regulation sections (jsonb)
  fsma: RegSection | null
  sales_threshold: RegSection | null
  cottage_food: RegSection | null
  permits: RegSection | null
  zoning: RegSection | null
  labeling: RegSection | null
  organic: RegSection | null
  pesticides: RegSection | null
  water: RegSection | null
  direct_sales: RegSection | null
  tax: RegSection | null
  official_urls: OfficialUrl[] | null

  created_at: string
  updated_at: string
}

export type RegulationUpdate = {
  id: string
  state_id: string | null
  market_id: string | null
  source: string | null       // 'USDA' | 'FDA' | 'EPA' | 'state_ag_dept'
  title: string
  summary: string | null
  change_type: string | null  // 'new_rule' | 'amendment' | 'repeal' | 'deadline'
  severity: string
  source_url: string | null
  detected_at: string
  effective_date: string | null
}
