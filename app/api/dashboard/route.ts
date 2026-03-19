import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Lookup profile: try user_id first, fall back to email (auto-migration)
    let profile = null
    const { data: byUserId } = await supabaseAdmin
      .from('farm_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (byUserId) {
      profile = byUserId
    } else {
      // Fall back to email match — one-time migration
      const { data: byEmail } = await supabaseAdmin
        .from('farm_profiles')
        .select('*')
        .eq('email', user.email!)
        .maybeSingle()

      if (byEmail) {
        await supabaseAdmin
          .from('farm_profiles')
          .update({ user_id: user.id })
          .eq('id', byEmail.id)
        profile = byEmail
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'Farm profile not found' }, { status: 404 })
    }

    // Get documents with auto-computed status based on expiry
    const { data: rawDocs } = await supabaseAdmin
      .from('farm_documents')
      .select('*')
      .eq('farm_id', profile.id)
      .order('expiry_date', { ascending: true })

    const today = new Date()
    const documents = (rawDocs || []).map(doc => {
      if (!doc.expiry_date) return doc
      const expiry = new Date(doc.expiry_date)
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
      let status = 'active'
      if (daysUntil < 0) status = 'expired'
      else if (daysUntil <= 60) status = 'expiring_soon'
      return { ...doc, status }
    })

    // Get applicable regulations filtered by country
    const farmCountry = profile.country || 'US'
    const { data: allRegs } = await supabaseAdmin
      .from('farm_regulations')
      .select('*')
      .eq('country', farmCountry)
      .order('severity', { ascending: true })

    const regulations = (allRegs || []).filter(reg => {
      const stateMatch = !reg.state || reg.state === profile.state
      if (!stateMatch) return false
      if (!reg.farm_types || reg.farm_types.length === 0) return true
      if (!profile.farm_type || profile.farm_type.length === 0) return true
      return reg.farm_types.some((t: string) => profile.farm_type.includes(t))
    })

    // Get alerts
    const { data: alerts } = await supabaseAdmin
      .from('farm_alerts')
      .select('*')
      .eq('farm_id', profile.id)
      .order('created_at', { ascending: false })

    // Fetch pinned market if set
    let pinnedMarket = null
    if (profile.market_id) {
      const { data: market } = await supabaseAdmin
        .from('fr_markets')
        .select('*, fr_states!inner(abbr, name)')
        .eq('id', profile.market_id)
        .maybeSingle()

      if (market) {
        const { fr_states, ...rest } = market as Record<string, unknown>
        pinnedMarket = { ...rest, state: fr_states }
      }
    }

    // Fetch checklist items if pinned market
    let checklistItems = null
    if (profile.market_id) {
      const { data: items } = await supabaseAdmin
        .from('fr_checklist_items')
        .select('*')
        .eq('farm_id', profile.id)
        .order('priority', { ascending: true })
        .order('section', { ascending: true })

      checklistItems = items
    }

    return NextResponse.json({
      profile,
      documents,
      regulations,
      alerts: alerts || [],
      pinnedMarket,
      checklistItems,
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
