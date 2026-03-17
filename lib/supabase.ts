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
