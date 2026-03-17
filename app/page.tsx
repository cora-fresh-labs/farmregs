'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FARM_TYPES = [
  { id: 'row_crop', label: 'Row Crops', emoji: '🌽' },
  { id: 'livestock', label: 'Livestock', emoji: '🐄' },
  { id: 'organic', label: 'Organic', emoji: '🌿' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛' },
  { id: 'specialty_crop', label: 'Specialty Crop', emoji: '🍓' },
  { id: 'aquaculture', label: 'Aquaculture', emoji: '🐟' },
]

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming'
]

export default function LandingPage() {
  const router = useRouter()
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [form, setForm] = useState({ email: '', farm_name: '', name: '', state: '', acreage: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.farm_name || selectedTypes.length === 0 || !form.state) {
      setError('Please fill in all required fields and select at least one farm type.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, farm_type: selectedTypes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      router.push(`/dashboard?email=${encodeURIComponent(form.email)}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      {/* Header */}
      <header className="bg-[#1b4332] text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🌾</span>
          <span className="text-xl font-bold tracking-tight">FarmRegs</span>
          <span className="text-green-300 text-sm ml-2">US Agricultural Compliance</span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1b4332] to-[#2d6a4f] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-[#d4a017]/20 text-[#f4d03f] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            Federal + State Regulation Tracking
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Know exactly what regulations apply to your farm.{' '}
            <span className="text-[#f4d03f]">Get notified the moment something changes.</span>
          </h1>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Track certifications, permits, and federal requirements. Never miss a deadline or compliance update. Built for US farmers, from small organic operations to large commercial farms.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-green-200">
            <span>✓ FSMA &amp; FDA compliance</span>
            <span>✓ USDA organic certification tracking</span>
            <span>✓ EPA &amp; state environmental rules</span>
            <span>✓ Labor law requirements</span>
          </div>
        </div>
      </section>

      {/* Sign-up Form */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Get your compliance dashboard</h2>
            <p className="text-gray-500 mb-8">Free. No password required. Just your farm details.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Farm Types */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Farm Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FARM_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleType(type.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedTypes.includes(type.id)
                          ? 'border-[#2d6a4f] bg-[#f0faf5] text-[#2d6a4f]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{type.emoji}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.state}
                  onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:border-transparent"
                >
                  <option value="">Select your state...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Farm Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Farm Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Sunshine Farms"
                    value={form.farm_name}
                    onChange={e => setForm(prev => ({ ...prev, farm_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="john@sunshinefarns.com"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Acreage (approx.)
                  </label>
                  <input
                    type="number"
                    placeholder="250"
                    value={form.acreage}
                    onChange={e => setForm(prev => ({ ...prev, acreage: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2d6a4f] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#1b4332] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="animate-spin">⟳</span> Setting up your dashboard...</>
                ) : (
                  <>Get my compliance dashboard →</>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                No password required. Access via email link. We&apos;ll send weekly regulation updates.
              </p>
            </form>
          </div>

          {/* Social proof */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { num: '18+', label: 'Regulations tracked' },
              { num: 'Federal', label: '+ all 50 states' },
              { num: 'Real-time', label: 'change notifications' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-[#2d6a4f]">{item.num}</div>
                <div className="text-sm text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-[#1b4332]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything your farm needs to stay compliant
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '📋',
                title: 'Document Vault',
                desc: 'Store all your certifications, permits, and licenses in one place. Get 90/60/30 day expiry reminders.'
              },
              {
                icon: '🔔',
                title: 'Regulation Alerts',
                desc: 'Instant notifications when FDA, USDA, or EPA regulations that affect your farm type change.'
              },
              {
                icon: '🤖',
                title: 'AI Compliance Assistant',
                desc: 'Ask any compliance question and get specific answers about your farm type, state, and acreage.'
              },
            ].map(f => (
              <div key={f.title} className="bg-white/10 rounded-xl p-6 text-white">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-green-200 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-gray-400 text-sm">
        <p>FarmRegs — Not legal advice. Always consult a qualified attorney for compliance decisions.</p>
        <p className="mt-1">© {new Date().getFullYear()} FarmRegs</p>
      </footer>
    </div>
  )
}
