import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from './supabase'

// --- Auth ---

export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return null // Allow in dev when no secret is set

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// --- In-Memory Cache ---

type CacheEntry<T> = { data: T; ts: number }
const cache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data
  return null
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() })
}

// --- Fetch with Timeout ---

export async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

// --- AI Summarization ---

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function summarizeChange(title: string, rawText: string): Promise<{
  summary: string
  severity: string
  change_type: string
}> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You analyze agricultural regulation changes. Given a regulation title and text, return a JSON object with:
- "summary": A 1-2 sentence plain-English summary of what changed and who it affects
- "severity": One of "critical", "warning", "info" based on impact to small/medium farmers
- "change_type": One of "new_rule", "amendment", "repeal", "deadline", "guidance"

Return ONLY valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nText: ${rawText.slice(0, 2000)}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.3,
  })

  try {
    const parsed = JSON.parse(completion.choices[0].message.content || '{}')
    return {
      summary: parsed.summary || title,
      severity: parsed.severity || 'info',
      change_type: parsed.change_type || 'guidance',
    }
  } catch {
    return { summary: title, severity: 'info', change_type: 'guidance' }
  }
}

// --- Insert Regulation Update ---

export async function insertRegulationUpdate(update: {
  state_id?: string | null
  market_id?: string | null
  source: string
  title: string
  summary: string
  change_type: string
  severity: string
  source_url?: string | null
  effective_date?: string | null
}): Promise<void> {
  const { error } = await supabaseAdmin.from('fr_regulation_updates').insert([update])
  if (error) {
    console.error('Failed to insert regulation update:', error.message)
  }
}

// --- Create Alert for Affected Farmers ---

export async function createAlertsForState(
  stateAbbr: string,
  title: string,
  description: string,
  severity: string,
): Promise<number> {
  // Find farms in this state
  const { data: farms } = await supabaseAdmin
    .from('farm_profiles')
    .select('id')
    .eq('state', stateAbbr)

  if (!farms || farms.length === 0) return 0

  const alerts = farms.map(f => ({
    farm_id: f.id,
    alert_type: 'regulation_change',
    title,
    description,
    action_required: severity === 'critical' ? 'Review immediately' : 'Review when convenient',
    status: 'active',
  }))

  const { error } = await supabaseAdmin.from('farm_alerts').insert(alerts)
  if (error) console.error('Failed to create alerts:', error.message)

  return alerts.length
}
