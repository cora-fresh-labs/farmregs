import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, farm_name, name, state, farm_type, acreage, country } = body

    if (!email || !farm_name || !state || !farm_type?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const farmCountry = country === 'AU' ? 'AU' : 'US'

    // Check if farm profile exists already
    // Use maybeSingle() so it returns null (not PGRST116 error) when no match
    const { data: existing } = await supabaseAdmin
      .from('farm_profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    let farmId: string

    if (existing) {
      farmId = existing.id
      // Update profile
      await supabaseAdmin
        .from('farm_profiles')
        .update({ farm_name, name, state, farm_type, acreage: acreage ? parseFloat(acreage) : null, country: farmCountry })
        .eq('id', farmId)
    } else {
      // Create new profile
      const { data: newProfile, error } = await supabaseAdmin
        .from('farm_profiles')
        .insert({
          email,
          farm_name,
          name,
          state,
          farm_type,
          acreage: acreage ? parseFloat(acreage) : null,
          country: farmCountry,
        })
        .select('id')
        .single()

      if (error) throw error
      if (!newProfile) throw new Error('Insert succeeded but no row returned — check RLS policies on farm_profiles')
      farmId = newProfile.id

      // Create initial alerts for applicable regulations
      const { data: regs } = await supabaseAdmin
        .from('farm_regulations')
        .select('id, title, summary, farm_types, severity, country')
        .eq('country', farmCountry)

      if (regs) {
        const applicable = regs.filter(reg =>
          !reg.farm_types || reg.farm_types.some((t: string) => farm_type.includes(t))
        )

        const criticalRegs = applicable.filter(r => r.severity === 'critical')
        if (criticalRegs.length > 0) {
          const alerts = criticalRegs.slice(0, 3).map(reg => ({
            farm_id: farmId,
            regulation_id: reg.id,
            alert_type: 'new_requirement',
            title: `Review required: ${reg.title}`,
            description: reg.summary?.substring(0, 200),
            action_required: 'Review this regulation and confirm your farm is compliant.',
            status: 'unread',
          }))
          await supabaseAdmin.from('farm_alerts').insert(alerts)
        }
      }
    }

    return NextResponse.json({ success: true, farmId })
  } catch (err: unknown) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Failed to create farm profile' }, { status: 500 })
  }
}
