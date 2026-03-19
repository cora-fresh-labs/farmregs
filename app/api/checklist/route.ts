import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — fetch checklist items for the current user
export async function GET() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('farm_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: items } = await supabaseAdmin
      .from('fr_checklist_items')
      .select('*')
      .eq('farm_id', profile.id)
      .order('priority', { ascending: true })
      .order('section', { ascending: true })

    return NextResponse.json({ items: items || [] })
  } catch (err) {
    console.error('Checklist GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
  }
}

// PATCH — toggle is_checked on a checklist item
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, is_checked } = await req.json()
    if (!id || typeof is_checked !== 'boolean') {
      return NextResponse.json({ error: 'id and is_checked required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('fr_checklist_items')
      .update({
        is_checked,
        checked_at: is_checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Checklist PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
  }
}
