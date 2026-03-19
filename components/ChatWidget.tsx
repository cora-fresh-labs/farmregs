'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { FarmProfile, FarmDocument, FarmAlert } from '@/lib/supabase'

type Message = {
  role: 'user' | 'assistant'
  content: string
  is_gated?: boolean
}

type ChatWidgetProps = {
  farmProfile: FarmProfile | null
  documents?: FarmDocument[]
  alerts?: FarmAlert[]
}

const IconArrowUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
)

function renderMarkdown(text: string) {
  const paragraphs = text.split(/\n{2,}/)
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n')
    return (
      <p key={pi} className={pi > 0 ? 'mt-3' : ''}>
        {lines.map((line, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {renderInline(line)}
          </span>
        ))}
      </p>
    )
  })
}

function renderInline(text: string) {
  const parts: (string | React.ReactElement)[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>)
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function buildGreeting(profile: FarmProfile | null, documents?: FarmDocument[], alerts?: FarmAlert[]): string {
  if (!profile) {
    return "I'm Fairchild, your compliance advisor. Set up your farm profile to get personalized advice."
  }

  const farmName = profile.farm_name || 'your farm'

  // Check if commodity is missing
  if (!profile.commodity) {
    return `Before I can give you specific advice, I need to know what you grow. What are your main crops or commodities at ${farmName}?`
  }

  // Find most urgent item
  const today = new Date()
  const expiredDocs = (documents || []).filter(d => {
    if (!d.expiry_date) return false
    return new Date(d.expiry_date) < today
  })
  const expiringDocs = (documents || []).filter(d => {
    if (!d.expiry_date) return false
    const days = Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86400000)
    return days >= 0 && days <= 30
  })
  const unreadAlerts = (alerts || []).filter(a => a.status === 'unread')

  if (expiredDocs.length > 0) {
    const doc = expiredDocs[0]
    const days = Math.abs(Math.ceil((new Date(doc.expiry_date!).getTime() - today.getTime()) / 86400000))
    return `I'm Fairchild, your compliance advisor for ${farmName}. Your **${doc.doc_name}** expired ${days} days ago — this needs immediate attention. What do you want to tackle first?`
  }

  if (expiringDocs.length > 0) {
    const doc = expiringDocs[0]
    const days = Math.ceil((new Date(doc.expiry_date!).getTime() - today.getTime()) / 86400000)
    return `I'm Fairchild, your compliance advisor for ${farmName}. Your **${doc.doc_name}** expires in ${days} days — let's get the renewal started. What do you want to tackle first?`
  }

  if (unreadAlerts.length > 0) {
    return `I'm Fairchild, your compliance advisor for ${farmName}. You have ${unreadAlerts.length} unread compliance alert${unreadAlerts.length > 1 ? 's' : ''} that need${unreadAlerts.length === 1 ? 's' : ''} review. What do you want to tackle first?`
  }

  return `I'm Fairchild, your compliance advisor for ${farmName}. Everything looks current — no urgent actions needed. Ask me anything about your regulatory requirements in ${profile.state || 'your state'}.`
}

function buildChips(profile: FarmProfile | null, documents?: FarmDocument[], alerts?: FarmAlert[]): string[] {
  const chips: string[] = []

  if (!profile) return ['What regulations apply to my farm?']

  const today = new Date()

  // Expiring documents
  const expiringDocs = (documents || []).filter(d => {
    if (!d.expiry_date) return false
    const days = Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86400000)
    return days >= 0 && days <= 60
  }).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())

  if (expiringDocs.length > 0) {
    const doc = expiringDocs[0]
    const days = Math.ceil((new Date(doc.expiry_date!).getTime() - today.getTime()) / 86400000)
    chips.push(`${doc.doc_name} expires in ${days} days — what do I do?`)
  }

  // Expired documents
  const expiredDocs = (documents || []).filter(d => {
    if (!d.expiry_date) return false
    return new Date(d.expiry_date) < today
  })
  if (expiredDocs.length > 0 && chips.length < 2) {
    chips.push(`My ${expiredDocs[0].doc_name} is expired — what now?`)
  }

  // Unread alerts
  const unreadAlerts = (alerts || []).filter(a => a.status === 'unread')
  if (unreadAlerts.length > 0 && chips.length < 2) {
    chips.push(`Explain the ${unreadAlerts[0].title} alert`)
  }

  // Always include these
  chips.push('Am I FSMA compliant?')
  chips.push(`What permits do I need in ${profile.state || 'my state'}?`)
  chips.push('Show me my compliance gaps')

  return chips.slice(0, 5)
}

export default function ChatWidget({ farmProfile, documents, alerts }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [greetingLoaded, setGreetingLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const unreadAlerts = (alerts || []).filter(a => a.status === 'unread')
  const hasUrgent = unreadAlerts.length > 0 || (documents || []).some(d => {
    if (!d.expiry_date) return false
    return new Date(d.expiry_date) < new Date()
  })

  // Pre-fetch greeting on mount
  useEffect(() => {
    if (!greetingLoaded) {
      const greeting = buildGreeting(farmProfile, documents, alerts)
      setMessages([{ role: 'assistant', content: greeting }])
      setGreetingLoaded(true)
    }
  }, [farmProfile, documents, alerts, greetingLoaded])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = useCallback(async (overrideMsg?: string) => {
    const userMsg = (overrideMsg || input).trim()
    if (!userMsg || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content || 'Sorry, I had trouble with that. Please try again.',
        is_gated: data.is_gated || false,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const chips = buildChips(farmProfile, documents, alerts)

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 w-[400px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-[var(--rule)] flex flex-col z-50" style={{ height: '540px' }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--rule)] flex items-center justify-between shrink-0">
            <div>
              <p className="font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)] text-base">Fairchild</p>
              <p className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--muted)] tracking-wide">
                Compliance advisor for {farmProfile?.farm_name || 'your farm'}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] hover:text-[var(--ink)] text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--off)] transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed font-[family-name:var(--font-body)] ${
                    msg.role === 'user'
                      ? 'bg-[var(--navy)] text-white rounded-br-sm'
                      : 'bg-white border border-[var(--rule)] text-[var(--navy)] rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      msg.is_gated ? (
                        <GatedMessage content={msg.content} />
                      ) : (
                        <div className="fairchild-msg">{renderMarkdown(msg.content)}</div>
                      )
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>

                {/* Quick action chips after first Fairchild message */}
                {i === 0 && msg.role === 'assistant' && messages.length <= 1 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {chips.map(chip => (
                      <button
                        key={chip}
                        onClick={() => send(chip)}
                        className="text-xs border border-[var(--navy)]/20 text-[var(--navy)] rounded-full px-3 py-1.5 hover:bg-[var(--navy)]/5 transition-colors font-[family-name:var(--font-body)] text-left"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[var(--rule)] rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-[var(--muted)] font-[family-name:var(--font-body)]">
                  <span className="animate-pulse">Fairchild is reviewing your farm profile...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[var(--rule)] shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask Fairchild anything about your farm..."
                className="flex-1 border border-[var(--rule)] rounded-xl px-4 py-2.5 text-sm font-[family-name:var(--font-body)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30 placeholder:text-[var(--muted)]"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="bg-[var(--navy)] text-white rounded-xl w-10 h-10 flex items-center justify-center hover:bg-[var(--navy-deep)] disabled:opacity-40 transition-colors shrink-0"
              >
                <IconArrowUp />
              </button>
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-2 text-center font-[family-name:var(--font-mono)]">Not legal advice. Consult a compliance professional.</p>
          </div>
        </div>
      )}

      {/* Trigger Button — pill */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-6 right-6 bg-[var(--navy)] text-white rounded-full px-5 py-3 flex items-center gap-2.5 shadow-lg hover:bg-[var(--navy-deep)] transition-all z-50 font-[family-name:var(--font-body)] text-sm font-medium"
        aria-label="Open Fairchild compliance assistant"
      >
        {open ? (
          <>
            <span className="text-lg leading-none">&times;</span>
            <span>Close</span>
          </>
        ) : (
          <>
            {hasUrgent && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            )}
            <span>Ask Fairchild</span>
          </>
        )}
      </button>
    </>
  )
}

function GatedMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  const previewLines = lines.slice(0, 3).join('\n')

  return (
    <div className="relative">
      <div className="fairchild-msg">{renderMarkdown(previewLines)}</div>
      <div className="relative mt-2">
        <div className="text-sm text-[var(--muted)] blur-[3px] select-none pointer-events-none" aria-hidden="true">
          {lines.slice(3, 8).join('\n') || 'Additional compliance details and recommendations for your specific situation...'}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white flex flex-col items-center justify-center pt-4">
          <p className="text-sm font-semibold text-[var(--navy)] font-[family-name:var(--font-body)] mb-1">
            Fairchild can draft this for you.
          </p>
          <p className="text-xs text-[var(--muted)] font-[family-name:var(--font-body)] mb-3">
            Upgrade to FarmRegs Pro — $49/month
          </p>
          <a
            href="/upgrade"
            className="inline-block bg-[var(--navy)] text-white text-xs font-[family-name:var(--font-body)] font-medium px-4 py-2 rounded-lg hover:bg-[var(--navy-deep)] transition-colors"
          >
            Upgrade to Pro
          </a>
        </div>
      </div>
    </div>
  )
}
