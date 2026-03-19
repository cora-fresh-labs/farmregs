import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import type { State, Market } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// Pro-gate trigger patterns
const GENERATION_TRIGGERS = [
  /\bdraft\s+(my|a|the)\b/i,
  /\bgenerate\s+(my|a|the)\b/i,
  /\bpre-?fill\b/i,
  /\bcreate\s+a\s+checklist\s+for\b/i,
  /\bwrite\s+(my|a|the)\b/i,
]

function isGenerationRequest(message: string): boolean {
  return GENERATION_TRIGGERS.some(pattern => pattern.test(message))
}

function summarizeMarket(m: Market): string {
  const parts: string[] = [`### ${m.name} (${m.type || 'Market'}) — ${m.status}`]

  if (m.fsma) parts.push(`- FSMA: ${(m.fsma as Record<string, unknown>).status || 'N/A'} — ${(m.fsma as Record<string, unknown>).details || ''}`)
  if (m.cottage_food) {
    const cf = m.cottage_food as Record<string, unknown>
    parts.push(`- Cottage Food: ${cf.allowed ? 'Allowed' : 'Not allowed'}, cap: ${cf.revenueCap || 'N/A'} — ${cf.details || ''}`)
  }
  if (m.permits) {
    const p = m.permits as Record<string, unknown>
    parts.push(`- Permits: ${Array.isArray(p.types) ? p.types.join(', ') : 'See details'} — ${p.details || ''}`)
  }
  if (m.organic) {
    const o = m.organic as Record<string, unknown>
    parts.push(`- Organic: Cert required: ${o.required ? 'Yes' : 'No'}, exempt under $5k: ${o.exemptUnder5k ? 'Yes' : 'No'}`)
  }
  if (m.sales_threshold) {
    const st = m.sales_threshold as Record<string, unknown>
    parts.push(`- Sales Threshold: Federal ${st.federal || 'N/A'}, State ${st.state || 'N/A'}`)
  }
  if (m.pesticides) parts.push(`- Pesticides: ${(m.pesticides as Record<string, unknown>).details || ''}`)
  if (m.water) parts.push(`- Water: ${(m.water as Record<string, unknown>).details || ''}`)
  if (m.zoning) parts.push(`- Zoning: ${(m.zoning as Record<string, unknown>).details || ''}`)
  if (m.labeling) parts.push(`- Labeling: ${(m.labeling as Record<string, unknown>).details || ''}`)
  if (m.direct_sales) {
    const ds = m.direct_sales as Record<string, unknown>
    parts.push(`- Direct Sales Channels: ${Array.isArray(ds.channels) ? ds.channels.join(', ') : 'See details'}`)
  }
  if (m.tax) {
    const t = m.tax as Record<string, unknown>
    parts.push(`- Tax: Sales tax exempt: ${t.salesTaxExempt ? 'Yes' : 'No'} — ${t.details || ''}`)
  }

  return parts.join('\n')
}

function extractMarketKeywords(message: string): string[] {
  return message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get farm profile
    let farmProfile = null
    const { data: byUserId } = await supabaseAdmin
      .from('farm_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (byUserId) {
      farmProfile = byUserId
    } else {
      const { data: byEmail } = await supabaseAdmin
        .from('farm_profiles')
        .select('*')
        .eq('email', user.email!)
        .maybeSingle()
      if (byEmail) {
        await supabaseAdmin.from('farm_profiles').update({ user_id: user.id }).eq('id', byEmail.id)
        farmProfile = byEmail
      }
    }

    const { messages } = await req.json()

    const farmCountry = farmProfile?.country || 'US'
    const isAU = farmCountry === 'AU'
    const userState = farmProfile?.state || null
    const lastMessage = messages?.[messages.length - 1]?.content || ''

    // Check for pro-gate trigger
    const isGenRequest = isGenerationRequest(lastMessage)
    const userPlan = farmProfile?.plan || 'free'

    // --- Fetch deep context ---

    // 1. Documents
    let documentsContext = 'No documents on file.'
    if (farmProfile) {
      const { data: rawDocs } = await supabaseAdmin
        .from('farm_documents')
        .select('*')
        .eq('farm_id', farmProfile.id)
        .order('expiry_date', { ascending: true })

      if (rawDocs && rawDocs.length > 0) {
        const today = new Date()
        const docLines = rawDocs.map(doc => {
          const daysUntil = doc.expiry_date
            ? Math.ceil((new Date(doc.expiry_date).getTime() - today.getTime()) / 86400000)
            : null
          let status = 'active'
          if (daysUntil !== null && daysUntil < 0) status = 'EXPIRED'
          else if (daysUntil !== null && daysUntil <= 60) status = 'EXPIRING SOON'
          return `- ${doc.doc_name} (${doc.doc_type || 'other'}) — Status: ${status}${daysUntil !== null ? `, ${daysUntil < 0 ? `expired ${Math.abs(daysUntil)} days ago` : `expires in ${daysUntil} days`}` : ', no expiry set'}${doc.issuing_body ? `, issued by ${doc.issuing_body}` : ''}`
        })
        documentsContext = docLines.join('\n')
      }
    }

    // 2. Alerts
    let alertsContext = 'No active alerts.'
    if (farmProfile) {
      const { data: alerts } = await supabaseAdmin
        .from('farm_alerts')
        .select('*')
        .eq('farm_id', farmProfile.id)
        .eq('status', 'unread')
        .order('created_at', { ascending: false })

      if (alerts && alerts.length > 0) {
        const alertLines = alerts.map(a =>
          `- [${a.alert_type || 'alert'}] ${a.title}${a.description ? ': ' + a.description : ''}${a.action_required ? ' — Action: ' + a.action_required : ''}${a.due_date ? ' (Due: ' + a.due_date + ')' : ''}`
        )
        alertsContext = alertLines.join('\n')
      }
    }

    // 3. Regulations
    let regulationsContext = 'No applicable regulations loaded.'
    if (farmProfile) {
      const { data: allRegs } = await supabaseAdmin
        .from('farm_regulations')
        .select('*')
        .eq('country', farmCountry)
        .order('severity', { ascending: true })

      const regulations = (allRegs || []).filter(reg => {
        const stateMatch = !reg.state || reg.state === farmProfile.state
        if (!stateMatch) return false
        if (!reg.farm_types || reg.farm_types.length === 0) return true
        if (!farmProfile.farm_type || farmProfile.farm_type.length === 0) return true
        return reg.farm_types.some((t: string) => farmProfile.farm_type.includes(t))
      })

      if (regulations.length > 0) {
        const regLines = regulations.map(r =>
          `- [${r.severity}] ${r.title} (${r.agency || 'N/A'})${r.summary ? ': ' + r.summary : ''}${r.effective_date ? ' — Effective: ' + r.effective_date : ''}`
        )
        regulationsContext = regLines.join('\n')
      }
    }

    // 4. Compliance score
    let scoreContext = ''
    if (farmProfile) {
      const { data: docs } = await supabaseAdmin
        .from('farm_documents')
        .select('*')
        .eq('farm_id', farmProfile.id)

      const { data: alerts } = await supabaseAdmin
        .from('farm_alerts')
        .select('*')
        .eq('farm_id', farmProfile.id)
        .eq('status', 'unread')

      const { data: checklistItems } = await supabaseAdmin
        .from('fr_checklist_items')
        .select('*')
        .eq('farm_id', farmProfile.id)

      const today = new Date()
      const expired = (docs || []).filter(d => d.expiry_date && new Date(d.expiry_date) < today).length
      const expiring = (docs || []).filter(d => {
        if (!d.expiry_date) return false
        const diff = Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86400000)
        return diff >= 0 && diff <= 60
      }).length

      let docScore = Math.max(0, Math.min(100, 100 - expired * 15 - expiring * 8))
      let alertScore = Math.max(0, Math.min(100, 100 - (alerts?.length || 0) * 5))

      let checklistScore = 100
      const items = checklistItems || []
      if (items.length > 0) {
        let totalWeight = 0, checkedWeight = 0
        for (const item of items) {
          const w = item.priority === 'high' ? 2 : 1
          totalWeight += w
          if (item.is_checked) checkedWeight += w
        }
        checklistScore = totalWeight > 0 ? Math.round((checkedWeight / totalWeight) * 100) : 100
      }

      const hasChecklist = items.length > 0
      const score = hasChecklist
        ? Math.round(docScore * 0.4 + alertScore * 0.1 + checklistScore * 0.5)
        : Math.round(docScore * 0.85 + alertScore * 0.15)

      const drags: string[] = []
      if (expired > 0) drags.push(`${expired} expired document(s)`)
      if (expiring > 0) drags.push(`${expiring} document(s) expiring soon`)
      if ((alerts?.length || 0) > 0) drags.push(`${alerts!.length} unread alert(s)`)
      if (hasChecklist && checklistScore < 100) {
        const unchecked = items.filter(i => !i.is_checked).length
        drags.push(`${unchecked} uncompleted checklist item(s)`)
      }

      scoreContext = `Current compliance score: ${score}/100.${drags.length > 0 ? ' Dragging it down: ' + drags.join(', ') + '.' : ' No issues detected.'}`
    }

    // --- RAG: Fetch relevant regulation data ---
    let ragContext = ''

    if (userState && !isAU) {
      const { data: stateData } = await supabaseAdmin
        .from('fr_states')
        .select('*')
        .eq('abbr', userState.toUpperCase())
        .single()

      if (stateData) {
        const state = stateData as State
        ragContext += `\n\n## Regulation Database — ${state.name} (${state.abbr})\n`
        ragContext += `Status: ${state.status_label || state.status}\n`
        ragContext += `Summary: ${state.summary}\n`
        ragContext += `Markets tracked: ${state.total_markets} (${state.counts?.unrestricted || 0} unrestricted, ${state.counts?.permitRequired || 0} permit required, ${state.counts?.prohibited || 0} prohibited)\n`

        const keywords = extractMarketKeywords(lastMessage)
        let markets: Market[] = []

        for (const kw of keywords) {
          if (kw.length < 3) continue
          const { data } = await supabaseAdmin
            .from('fr_markets')
            .select('*')
            .eq('state_id', state.id)
            .or(`name.ilike.%${kw}%,county.ilike.%${kw}%`)
            .limit(3)

          if (data && data.length > 0) {
            markets = data as Market[]
            break
          }
        }

        if (markets.length === 0) {
          const { data } = await supabaseAdmin
            .from('fr_markets')
            .select('*')
            .eq('state_id', state.id)
            .limit(3)

          markets = (data || []) as Market[]
        }

        if (markets.length > 0) {
          ragContext += '\n### Relevant Market Regulations:\n'
          for (const m of markets) {
            ragContext += summarizeMarket(m) + '\n\n'
          }
        }

        const { data: updates } = await supabaseAdmin
          .from('fr_regulation_updates')
          .select('*')
          .eq('state_id', state.id)
          .order('detected_at', { ascending: false })
          .limit(5)

        if (updates && updates.length > 0) {
          ragContext += '\n### Recent Regulatory Changes:\n'
          for (const u of updates) {
            ragContext += `- [${u.change_type}] ${u.title}: ${u.summary} (Source: ${u.source}, ${u.effective_date || 'TBD'})\n`
          }
        }
      }
    }

    // --- Build Fairchild System Prompt ---
    const farmContext = farmProfile ? `
You have full context about this specific farm:
- Farm name: ${farmProfile.farm_name || 'Unknown'}
- Operator: ${farmProfile.name || 'Unknown'}
- State: ${farmProfile.state || 'Unknown'}
- Farm types: ${farmProfile.farm_type?.join(', ') || 'Unknown'}
- Commodity: ${farmProfile.commodity || 'NOT SET — ask the farmer what they grow'}
- Acreage: ${farmProfile.acreage || 'Unknown'}
- Country: ${isAU ? 'Australia' : 'United States'}

Documents on file:
${documentsContext}

Active alerts:
${alertsContext}

Applicable regulations:
${regulationsContext}

${scoreContext}
` : 'No farm profile available. Ask the user to set up their farm profile first.'

    const systemPrompt = `You are Fairchild, a specialized agricultural compliance advisor built into FarmRegs. You are named after David Fairchild, the botanist who introduced over 200,000 plant species to the United States.

${farmContext}
${ragContext ? `\n--- REGULATION DATABASE (use this data to give specific, accurate answers) ---${ragContext}\n---` : ''}

Your rules:
1. NEVER give generic answers. Always lead with what you know about THIS farm specifically.
2. Skip introductory preamble. Do not say "Great question" or "Here's what you need to know." Get straight to the specific situation.
3. When a regulation applies, tell them:
   - Whether they are IN or OUT of compliance right now
   - What specific action is needed (not a category of action — the actual next step)
   - A realistic timeline or deadline if one exists
   - What it will cost in time or money if you can estimate it
4. If you can see a document is missing or expiring, call it out proactively without being asked.
5. Use plain language. No numbered lists of 8 generic requirements. Write like a knowledgeable advisor talking to a farmer, not a compliance manual.
6. When you recommend an action, offer to help complete it: "Want me to draft that for you?" or "I can generate a pre-filled checklist for this."
7. If the farm profile is missing commodity data (commodity is "NOT SET"), ask for it immediately because it changes your advice significantly.
8. You have access to the farm's uploaded documents. If a document is missing that should exist for their farm type, flag it.
9. Use **bold** for emphasis. Use line breaks between paragraphs. Keep responses focused and direct.
10. Always recommend consulting with a compliance professional for final determinations, but only mention this briefly at the end, not as the main focus.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
      max_tokens: 1000,
      temperature: 0.4,
    })

    const content = completion.choices[0].message.content || ''

    return NextResponse.json({
      content,
      is_gated: isGenRequest && userPlan === 'free',
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
