import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { farm_id, doc_type, doc_name, expiry_date, issuing_body, notes } = body

    if (!farm_id || !doc_type || !doc_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Compute status based on expiry
    let status = 'active'
    if (expiry_date) {
      const days = Math.ceil((new Date(expiry_date).getTime() - Date.now()) / 86400000)
      if (days < 0) status = 'expired'
      else if (days <= 60) status = 'expiring_soon'
    }

    const { data: document, error } = await supabaseAdmin
      .from('farm_documents')
      .insert({ farm_id, doc_type, doc_name, expiry_date: expiry_date || null, issuing_body, notes, status })
      .select('*')
      .single()

    if (error) throw error

    // Create an alert if expiring soon
    if (status === 'expiring_soon' || status === 'expired') {
      const days = expiry_date ? Math.ceil((new Date(expiry_date).getTime() - Date.now()) / 86400000) : 0
      await supabaseAdmin.from('farm_alerts').insert({
        farm_id,
        alert_type: 'doc_expiring',
        title: status === 'expired'
          ? `${doc_name} has expired`
          : `${doc_name} expires in ${days} days`,
        description: `Your ${doc_type?.replace('_', ' ')} document needs renewal attention.`,
        action_required: 'Contact the issuing body to begin the renewal process.',
        due_date: expiry_date,
        status: 'unread',
      })
    }

    return NextResponse.json({ document })
  } catch (err) {
    console.error('Document creation error:', err)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
