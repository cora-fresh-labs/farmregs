'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const US_FARM_TYPES = [
  { id: 'row_crop', label: 'Row Crops', emoji: '🌽' },
  { id: 'livestock', label: 'Livestock', emoji: '🐄' },
  { id: 'organic', label: 'Organic', emoji: '🌿' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛' },
  { id: 'specialty_crop', label: 'Specialty Crop', emoji: '🍓' },
  { id: 'aquaculture', label: 'Aquaculture', emoji: '🐟' },
]

const AU_FARM_TYPES = [
  { id: 'grain_broadacre', label: 'Grain/Broadacre', emoji: '🌾' },
  { id: 'horticulture', label: 'Horticulture', emoji: '🍎' },
  { id: 'livestock', label: 'Livestock', emoji: '🐄' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛' },
  { id: 'viticulture', label: 'Viticulture', emoji: '🍇' },
  { id: 'aquaculture', label: 'Aquaculture', emoji: '🐟' },
  { id: 'organic', label: 'Organic', emoji: '🌿' },
  { id: 'mixed', label: 'Mixed', emoji: '🚜' },
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

const AU_STATES = [
  'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'
]

const AU_STATE_LABELS: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA: 'Western Australia',
  SA: 'South Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
}

export default function LandingPage() {
  const router = useRouter()
  const [country, setCountry] = useState<'US' | 'AU'>('US')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [form, setForm] = useState({ email: '', farm_name: '', name: '', state: '', acreage: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load country from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('farmregs_country') as 'US' | 'AU' | null
    if (saved === 'US' || saved === 'AU') setCountry(saved)
  }, [])

  // Persist country selection and reset state/types on switch
  const handleCountryChange = (c: 'US' | 'AU') => {
    setCountry(c)
    localStorage.setItem('farmregs_country', c)
    setSelectedTypes([])
    setForm(prev => ({ ...prev, state: '' }))
  }

  const farmTypes = country === 'AU' ? AU_FARM_TYPES : US_FARM_TYPES
  const states = country === 'AU' ? AU_STATES : US_STATES

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
        body: JSON.stringify({ ...form, farm_type: selectedTypes, country }),
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

  const isAU = country === 'AU'
  const accentColor = isAU ? '#0055A5' : '#2d6a4f'
  const headerBg = isAU ? '#0C2340' : '#1b4332'
  const heroBg = isAU ? 'from-[#0C2340] to-[#0055A5]' : 'from-[#1b4332] to-[#2d6a4f]'

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      {/* Header */}
      <header style={{ backgroundColor: headerBg }} className="text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <span className="text-xl font-bold tracking-tight">FarmRegs</span>
            <span className="text-sm ml-2 opacity-70">Agricultural Compliance</span>
          </div>
          {/* Country Toggle */}
          <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
            <button
              onClick={() => handleCountryChange('US')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                country === 'US' ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'
              }`}
            >
              🇺🇸 United States
            </button>
            <button
              onClick={() => handleCountryChange('AU')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                country === 'AU' ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'
              }`}
            >
              🇦🇺 Australia
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`bg-gradient-to-b ${heroBg} text-white py-20 px-6`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/10 text-white/90 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            {isAU ? 'Federal + State Regulation Tracking — Australia' : 'Federal + State Regulation Tracking'}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Know exactly what regulations apply to your farm.{' '}
            <span style={{ color: isAU ? '#FFD700' : '#f4d03f' }}>Get notified the moment something changes.</span>
          </h1>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            {isAU
              ? 'Track FSANZ, APVMA, DAFF biosecurity, NLIS, and state-specific requirements. Built for Australian farmers, from small organic operations to large commercial farms.'
              : 'Track certifications, permits, and federal requirements. Never miss a deadline or compliance update. Built for US farmers, from small organic operations to large commercial farms.'}
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm opacity-80">
            {isAU ? (
              <>
                <span>✓ FSANZ &amp; food safety standards</span>
                <span>✓ APVMA chemical registration</span>
                <span>✓ DAFF biosecurity &amp; export</span>
                <span>✓ NLIS livestock identification</span>
              </>
            ) : (
              <>
                <span>✓ FSMA &amp; FDA compliance</span>
                <span>✓ USDA organic certification tracking</span>
                <span>✓ EPA &amp; state environmental rules</span>
                <span>✓ Labor law requirements</span>
              </>
            )}
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
                  {farmTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleType(type.id)}
                      style={selectedTypes.includes(type.id) ? { borderColor: accentColor, color: accentColor } : {}}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedTypes.includes(type.id)
                          ? 'bg-opacity-5'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{type.emoji}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* State / Territory */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isAU ? 'State / Territory' : 'State'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.state}
                  onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                >
                  <option value="">{isAU ? 'Select state/territory...' : 'Select your state...'}</option>
                  {isAU
                    ? AU_STATES.map(s => <option key={s} value={s}>{AU_STATE_LABELS[s]} ({s})</option>)
                    : US_STATES.map(s => <option key={s} value={s}>{s}</option>)
                  }
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
                    placeholder={isAU ? 'Outback Station' : 'Sunshine Farms'}
                    value={form.farm_name}
                    onChange={e => setForm(prev => ({ ...prev, farm_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
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
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
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
                    placeholder="john@myfarm.com"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {isAU ? 'Hectares (approx.)' : 'Acreage (approx.)'}
                  </label>
                  <input
                    type="number"
                    placeholder={isAU ? '100' : '250'}
                    value={form.acreage}
                    onChange={e => setForm(prev => ({ ...prev, acreage: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
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
                style={{ backgroundColor: accentColor }}
                className="w-full text-white py-4 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90"
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
            {isAU ? [
              { num: '10+', label: 'AU regulations tracked' },
              { num: 'Federal', label: '+ all states & territories' },
              { num: 'Real-time', label: 'change notifications' },
            ] : [
              { num: '18+', label: 'Regulations tracked' },
              { num: 'Federal', label: '+ all 50 states' },
              { num: 'Real-time', label: 'change notifications' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold" style={{ color: accentColor }}>{item.num}</div>
                <div className="text-sm text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6" style={{ backgroundColor: headerBg }}>
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
                desc: isAU
                  ? 'Instant notifications when FSANZ, APVMA, DAFF, or state regulations that affect your farm change.'
                  : 'Instant notifications when FDA, USDA, or EPA regulations that affect your farm type change.'
              },
              {
                icon: '🤖',
                title: 'AI Compliance Assistant',
                desc: 'Ask any compliance question and get specific answers about your farm type, state, and operations.'
              },
            ].map(f => (
              <div key={f.title} className="bg-white/10 rounded-xl p-6 text-white">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed opacity-80">{f.desc}</p>
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
