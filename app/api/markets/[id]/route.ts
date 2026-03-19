import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Look up by slug (from URL) — need state context, so try by id first, then by slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  let market
  let error

  if (isUuid) {
    const res = await supabaseAdmin.from('fr_markets').select('*').eq('id', id).single()
    market = res.data
    error = res.error
  } else {
    const res = await supabaseAdmin.from('fr_markets').select('*').eq('slug', id).limit(1).single()
    market = res.data
    error = res.error
  }

  if (error || !market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  // Get the parent state info
  const { data: state } = await supabaseAdmin
    .from('fr_states')
    .select('abbr, name')
    .eq('id', market.state_id)
    .single()

  return NextResponse.json({ ...market, state })
}
