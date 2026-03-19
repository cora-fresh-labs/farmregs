import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get farm profile
    const { data: profile } = await supabaseAdmin
      .from('farm_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) {
      // Fallback to email
      const { data: byEmail } = await supabaseAdmin
        .from('farm_profiles')
        .select('*')
        .eq('email', user.email!)
        .maybeSingle()

      if (!byEmail) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

      // Link user_id
      await supabaseAdmin.from('farm_profiles').update({ user_id: user.id }).eq('id', byEmail.id)
      Object.assign(byEmail, { user_id: user.id })
    }

    const farmProfile = profile || (await supabaseAdmin
      .from('farm_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()).data

    if (!farmProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const email = farmProfile.email

    // Get documents expiring soon
    const { data: rawDocs } = await supabaseAdmin
      .from('farm_documents')
      .select('*')
      .eq('farm_id', farmProfile.id)

    const today = new Date()
    const expiringDocs = (rawDocs || []).filter(doc => {
      if (!doc.expiry_date) return false
      const days = Math.ceil((new Date(doc.expiry_date).getTime() - today.getTime()) / 86400000)
      return days >= 0 && days <= 90
    }).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())

    // Get unread alerts
    const { data: alerts } = await supabaseAdmin
      .from('farm_alerts')
      .select('*')
      .eq('farm_id', farmProfile.id)
      .eq('status', 'unread')
      .limit(5)

    const farmTypeLabels: Record<string, string> = {
      row_crop: 'Row Crops', livestock: 'Livestock', organic: 'Organic',
      dairy: 'Dairy', specialty_crop: 'Specialty Crop', aquaculture: 'Aquaculture'
    }

    const docRows = expiringDocs.length > 0
      ? expiringDocs.map(doc => {
          const days = Math.ceil((new Date(doc.expiry_date).getTime() - today.getTime()) / 86400000)
          const status = days <= 30 ? '🔴' : days <= 60 ? '⚠️' : '📅'
          return `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${status} ${doc.doc_name}</td><td style="padding: 10px; border-bottom: 1px solid #eee; color: ${days <= 30 ? '#dc2626' : '#d97706'};">${days} days</td></tr>`
        }).join('')
      : '<tr><td colspan="2" style="padding: 10px; color: #666;">No documents expiring in the next 90 days</td></tr>'

    const alertRows = (alerts || []).length > 0
      ? (alerts || []).map(a => `<li style="margin-bottom: 10px;">⚠️ <strong>${a.title}</strong>${a.action_required ? `<br><span style="color: #666; font-size: 14px;">${a.action_required}</span>` : ''}</li>`).join('')
      : '<li style="color: #666;">No active alerts</li>'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #faf7f0;">
  <div style="background: #1b4332; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🌾 FarmRegs Weekly Digest</h1>
    <p style="color: #86efac; margin-top: 8px;">${farmProfile.farm_name} — ${farmProfile.state}</p>
  </div>

  <div style="padding: 30px; background: white; margin: 20px 0; border-radius: 12px;">
    <p style="color: #374151; font-size: 16px;">Hi ${farmProfile.name || 'there'},</p>
    <p style="color: #6b7280;">Here's your weekly compliance summary for <strong>${farmProfile.farm_name}</strong> (${farmProfile.farm_type?.map((t: string) => farmTypeLabels[t] || t).join(', ')}, ${farmProfile.state}).</p>

    <h2 style="color: #1b4332; border-bottom: 2px solid #d1fae5; padding-bottom: 10px;">📄 Document Expiry Tracker</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f0fdf4;">
          <th style="padding: 10px; text-align: left; color: #374151;">Document</th>
          <th style="padding: 10px; text-align: left; color: #374151;">Days Until Expiry</th>
        </tr>
      </thead>
      <tbody>${docRows}</tbody>
    </table>

    <h2 style="color: #1b4332; border-bottom: 2px solid #d1fae5; padding-bottom: 10px; margin-top: 30px;">⚡ Action Items</h2>
    <ul style="padding-left: 20px; line-height: 1.8;">${alertRows}</ul>

    <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: center;">
      <a href="https://farmregs.vercel.app/dashboard" style="background: #2d6a4f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Full Dashboard
      </a>
    </div>
  </div>

  <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>FarmRegs — Not legal advice. Consult a qualified attorney for compliance decisions.</p>
    <p>You're receiving this because you signed up at farmregs.vercel.app</p>
  </div>
</body>
</html>`

    await resend.emails.send({
      from: 'FarmRegs <lucile.seal@coraglobalprojects.com>',
      to: email,
      subject: `🌾 FarmRegs Weekly: ${expiringDocs.length > 0 ? `${expiringDocs.length} document(s) need attention` : 'Your compliance summary'} — ${farmProfile.farm_name}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notify error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
