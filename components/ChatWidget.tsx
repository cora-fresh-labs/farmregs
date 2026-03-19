'use client'

import { useState, useRef, useEffect } from 'react'
import type { FarmProfile } from '@/lib/supabase'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const IconChat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

export default function ChatWidget({ farmProfile }: { farmProfile: FarmProfile | null }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: farmProfile
        ? `Hi! I'm your FarmRegs compliance assistant. I can help you understand regulations for ${farmProfile.farm_name || 'your farm'} in ${farmProfile.state || 'your state'}. What would you like to know?`
        : "Hi! I'm your FarmRegs compliance assistant. Ask me anything about US agricultural regulations."
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (overrideMsg?: string) => {
    const userMsg = (overrideMsg || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'Sorry, I had trouble with that. Please try again.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = [
    'Do I need FSMA certification?',
    'When must I renew organic cert?',
    'What EPA permits do I need?',
    'H-2A requirements for my farm?',
  ]

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-[var(--rule)] flex flex-col z-50" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-[var(--navy)] text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconChat />
              <div>
                <p className="font-[family-name:var(--font-body)] font-semibold text-sm">AI Compliance Assistant</p>
                <p className="text-white/50 text-xs font-[family-name:var(--font-mono)]">Powered by FarmRegs</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white text-xl leading-none">&times;</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed font-[family-name:var(--font-body)] ${
                  msg.role === 'user'
                    ? 'bg-[var(--navy)] text-white rounded-br-sm'
                    : 'bg-[var(--off)] text-[var(--ink)] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--off)] rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-[var(--muted)]">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map(q => (
                  <button
                    key={q}
                    onClick={() => { send(q); }}
                    className="text-xs bg-[var(--off)] text-[var(--ocean)] border border-[var(--rule)] rounded-full px-3 py-1 hover:bg-[var(--ocean)]/5 transition-colors font-[family-name:var(--font-body)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-[var(--rule)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about your compliance..."
                className="flex-1 border border-[var(--rule)] rounded-xl px-4 py-2.5 text-sm font-[family-name:var(--font-body)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="bg-[var(--navy)] text-white rounded-xl px-4 py-2.5 text-sm font-[family-name:var(--font-body)] font-medium hover:bg-[var(--navy-deep)] disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mt-2 text-center font-[family-name:var(--font-body)]">Not legal advice. Consult a compliance professional.</p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-6 right-6 bg-[var(--navy)] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-[var(--navy-deep)] transition-all z-50"
        aria-label="Open compliance assistant"
      >
        {open ? (
          <span className="text-2xl leading-none">&times;</span>
        ) : (
          <IconChat />
        )}
      </button>
    </>
  )
}
