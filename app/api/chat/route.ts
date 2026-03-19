import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import type { State, Market } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

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

    const farmContext = farmProfile ? `
Farm context:
- Farm name: ${farmProfile.farm_name || 'Unknown'}
- Country: ${isAU ? 'Australia' : 'United States'}
- State: ${farmProfile.state || 'Unknown'}
- Farm types: ${farmProfile.farm_type?.join(', ') || 'Unknown'}
- Acreage: ${farmProfile.acreage || 'Unknown'}
` : ''

    const auExpertise = isAU ? `

If the farmer is in Australia, you are an expert in Australian agricultural compliance including:
FSANZ food safety standards, APVMA chemical regulations, DAFF biosecurity and export requirements,
Australian Certified Organic standards, NLIS livestock identification, state-specific vegetation
clearing laws, and Fair Work Act provisions for farm workers.` : ''

    const usExpertise = !isAU ? `

Focus on US-specific regulations:
- FSMA (Food Safety Modernization Act) rules
- USDA organic certification requirements
- EPA pesticide applicator licensing
- Water quality regulations
- Cottage food laws and sales thresholds
- Permits, zoning, labeling requirements
- Direct sales channels and tax exemptions
- State-specific rules` : ''

    const systemPrompt = `You are an agricultural compliance expert assistant for FarmRegs. Help farmers understand their regulatory obligations.

${farmContext}${auExpertise}${usExpertise}
${ragContext ? `\n--- REGULATION DATABASE (use this data to give specific, accurate answers) ---${ragContext}\n---\nWhen answering, cite specific regulation details from the database above. If the farmer asks about a specific county or city, use that market's data. Be precise about permit types, revenue caps, FSMA status, and sales tax exemptions.` : ''}

Be specific about which regulations apply based on farm type, state, acreage, and commodities. Keep answers concise, practical, and actionable. Use bullet points for multi-part answers. Always recommend consulting with a compliance professional for final determinations.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
      max_tokens: 800,
      temperature: 0.5,
    })

    return NextResponse.json({
      content: completion.choices[0].message.content
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
