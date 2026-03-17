import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { messages, farmProfile } = await req.json()

    const farmContext = farmProfile ? `
Farm context:
- Farm name: ${farmProfile.farm_name || 'Unknown'}
- State: ${farmProfile.state || 'Unknown'}
- Farm types: ${farmProfile.farm_type?.join(', ') || 'Unknown'}
- Acreage: ${farmProfile.acreage || 'Unknown'}
` : ''

    const systemPrompt = `You are a US agricultural compliance expert assistant for FarmRegs. Help farmers understand their regulatory obligations.

${farmContext}

Be specific about which regulations apply based on farm type, state, acreage, and commodities. Focus on:
- FSMA (Food Safety Modernization Act) rules
- USDA organic certification requirements
- EPA pesticide applicator licensing
- Water quality regulations (WOTUS, NPDES, CAFOs)
- Labor law (H-2A, OSHA field sanitation, WPS)
- State-specific rules (especially California)
- USDA program eligibility and reporting

Keep answers concise, practical, and actionable. Use bullet points for multi-part answers. Always recommend consulting with an attorney or certified compliance professional for final determinations. Never provide definitive legal advice.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // Last 10 messages for context
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    return NextResponse.json({
      content: completion.choices[0].message.content
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
