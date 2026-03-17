import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Get farm profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('farm_profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Farm profile not found' }, { status: 404 })
    }

    // Get documents with auto-computed status based on expiry
    const { data: rawDocs } = await supabaseAdmin
      .from('farm_documents')
      .select('*')
      .eq('farm_id', profile.id)
      .order('expiry_date', { ascending: true })

    // Auto-update document statuses based on expiry
    const today = new Date()
    const documents = (rawDocs || []).map(doc => {
      if (!doc.expiry_date) return doc
      const expiry = new Date(doc.expiry_date)
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
      let status = 'active'
      if (daysUntil < 0) status = 'expired'
      else if (daysUntil <= 30) status = 'expiring_soon'
      else if (daysUntil <= 60) status = 'expiring_soon'
      return { ...doc, status }
    })

    // Get applicable regulations
    const { data: allRegs } = await supabaseAdmin
      .from('farm_regulations')
      .select('*')
      .order('severity', { ascending: true })

    const regulations = (allRegs || []).filter(reg => {
      if (!reg.farm_types || reg.farm_types.length === 0) return true
      if (!profile.farm_type || profile.farm_type.length === 0) return true
      const stateMatch = !reg.state || reg.state === profile.state
      const typeMatch = reg.farm_types.some((t: string) => profile.farm_type.includes(t))
      return stateMatch && typeMatch
    })

    // Get alerts
    const { data: alerts } = await supabaseAdmin
      .from('farm_alerts')
      .select('*')
      .eq('farm_id', profile.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ profile, documents, regulations, alerts: alerts || [] })
  } catch (err) {
    console.error('Dashboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
