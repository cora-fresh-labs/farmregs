import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ abbr: string }> }
) {
  const { abbr } = await params

  const { data: state, error: stateErr } = await supabaseAdmin
    .from('fr_states')
    .select('*')
    .eq('abbr', abbr.toUpperCase())
    .single()

  if (stateErr || !state) {
    return NextResponse.json({ error: 'State not found' }, { status: 404 })
  }

  const { data: markets, error: marketsErr } = await supabaseAdmin
    .from('fr_markets')
    .select('id, name, slug, type, county, status, permit_required, last_verified')
    .eq('state_id', state.id)
    .order('name')

  if (marketsErr) {
    return NextResponse.json({ error: marketsErr.message }, { status: 500 })
  }

  return NextResponse.json({ ...state, markets })
}
