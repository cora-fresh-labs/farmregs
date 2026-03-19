import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateChecklist } from '@/lib/checklist-generator'

export async function POST() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('farm_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile || !profile.market_id) {
      return NextResponse.json({ error: 'Pin a market first' }, { status: 400 })
    }

    const { data: market } = await supabaseAdmin
      .from('fr_markets')
      .select('*')
      .eq('id', profile.market_id)
      .single()

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    // Delete old items
    await supabaseAdmin
      .from('fr_checklist_items')
      .delete()
      .eq('farm_id', profile.id)

    // Generate new items
    const items = generateChecklist(market, profile)

    if (items.length > 0) {
      await supabaseAdmin
        .from('fr_checklist_items')
        .insert(items.map(item => ({
          ...item,
          farm_id: profile.id,
          market_id: profile.market_id,
        })))
    }

    // Fetch fresh items
    const { data: freshItems } = await supabaseAdmin
      .from('fr_checklist_items')
      .select('*')
      .eq('farm_id', profile.id)
      .order('priority', { ascending: true })
      .order('section', { ascending: true })

    return NextResponse.json({ items: freshItems || [], generated: items.length })
  } catch (err) {
    console.error('Checklist generate error:', err)
    return NextResponse.json({ error: 'Failed to generate checklist' }, { status: 500 })
  }
}
