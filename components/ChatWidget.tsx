'use client'

import { useState, useRef, useEffect } from 'react'
import type { FarmProfile } from '@/lib/supabase'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

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
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-[#1b4332] text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="font-semibold text-sm">AI Compliance Assistant</p>
                <p className="text-green-300 text-xs">Powered by FarmRegs</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-green-200 hover:text-white text-xl leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#2d6a4f] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-500">
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
                    className="text-xs bg-green-50 text-[#2d6a4f] border border-green-200 rounded-full px-3 py-1 hover:bg-green-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about your compliance..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="bg-[#2d6a4f] text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-[#1b4332] disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Not legal advice. Consult a compliance professional.</p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-6 right-6 bg-[#2d6a4f] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-[#1b4332] transition-all z-50 text-2xl"
        aria-label="Open compliance assistant"
      >
        {open ? '×' : '🤖'}
      </button>
    </>
  )
}
