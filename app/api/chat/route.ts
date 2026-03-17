import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { messages, farmProfile } = await req.json()

    const farmCountry = farmProfile?.country || 'US'
    const isAU = farmCountry === 'AU'

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
clearing laws, and Fair Work Act provisions for farm workers. Reference the correct Australian
agencies (not US ones) when answering Australian farmers.

Focus on Australian-specific regulations:
- FSANZ Food Standards Code (food safety for farms selling direct to public)
- APVMA chemical product registration and applicator records
- DAFF biosecurity, phytosanitary certification, and export requirements
- NLIS (National Livestock Identification System) for cattle, sheep, goats
- State-based vegetation clearing laws (Vegetation Management Act in QLD, etc.)
- Safe Work Australia Model WHS Laws for farm workers
- Fair Work Act seasonal worker and harvest worker provisions
- ACO / NASAA organic certification requirements` : ''

    const usExpertise = !isAU ? `

Focus on US-specific regulations:
- FSMA (Food Safety Modernization Act) rules
- USDA organic certification requirements
- EPA pesticide applicator licensing
- Water quality regulations (WOTUS, NPDES, CAFOs)
- Labor law (H-2A, OSHA field sanitation, WPS)
- State-specific rules (especially California)
- USDA program eligibility and reporting` : ''

    const systemPrompt = `You are an agricultural compliance expert assistant for FarmRegs. Help farmers understand their regulatory obligations.

${farmContext}${auExpertise}${usExpertise}

Be specific about which regulations apply based on farm type, state, acreage, and commodities. Keep answers concise, practical, and actionable. Use bullet points for multi-part answers. Always recommend consulting with an attorney or certified compliance professional for final determinations. Never provide definitive legal advice.`

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
