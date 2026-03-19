import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateChecklist } from '@/lib/checklist-generator'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { market_id } = await req.json()
    if (!market_id) {
      return NextResponse.json({ error: 'market_id required' }, { status: 400 })
    }

    // Verify market exists
    const { data: market } = await supabaseAdmin
      .from('fr_markets')
      .select('id')
      .eq('id', market_id)
      .maybeSingle()

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    // Get profile
    let profile = null
    const { data: byUserId } = await supabaseAdmin
      .from('farm_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (byUserId) {
      profile = byUserId
    } else {
      const { data: byEmail } = await supabaseAdmin
        .from('farm_profiles')
        .select('*')
        .eq('email', user.email!)
        .maybeSingle()
      if (byEmail) {
        await supabaseAdmin.from('farm_profiles').update({ user_id: user.id }).eq('id', byEmail.id)
        profile = byEmail
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Update market_id on profile
    await supabaseAdmin
      .from('farm_profiles')
      .update({ market_id })
      .eq('id', profile.id)

    // Regenerate checklist
    const { data: fullMarket } = await supabaseAdmin
      .from('fr_markets')
      .select('*')
      .eq('id', market_id)
      .single()

    if (fullMarket) {
      // Delete old checklist items
      await supabaseAdmin
        .from('fr_checklist_items')
        .delete()
        .eq('farm_id', profile.id)

      // Generate new items
      const items = generateChecklist(fullMarket, profile)

      if (items.length > 0) {
        await supabaseAdmin
          .from('fr_checklist_items')
          .insert(items.map(item => ({
            ...item,
            farm_id: profile.id,
            market_id,
          })))
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Pin market error:', err)
    return NextResponse.json({ error: 'Failed to pin market' }, { status: 500 })
  }
}
