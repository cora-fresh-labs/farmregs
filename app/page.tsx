'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

// --- SVG Icons ---
const IconDocument = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const IconBell = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const IconHelp = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconArrowRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const IconMail = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--straw)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

// --- Data ---
const US_FARM_TYPES = [
  { id: 'row_crop', label: 'Row Crops' },
  { id: 'livestock', label: 'Livestock' },
  { id: 'organic', label: 'Organic' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'specialty_crop', label: 'Specialty Crop' },
  { id: 'aquaculture', label: 'Aquaculture' },
]

const AU_FARM_TYPES = [
  { id: 'grain_broadacre', label: 'Grain / Broadacre' },
  { id: 'horticulture', label: 'Horticulture' },
  { id: 'livestock', label: 'Livestock' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'viticulture', label: 'Viticulture' },
  { id: 'aquaculture', label: 'Aquaculture' },
  { id: 'organic', label: 'Organic' },
  { id: 'mixed', label: 'Mixed' },
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

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

const AU_STATE_LABELS: Record<string, string> = {
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland',
  WA: 'Western Australia', SA: 'South Australia', TAS: 'Tasmania',
  ACT: 'Australian Capital Territory', NT: 'Northern Territory',
}

const AGENCIES_US = ['FDA / FSMA', 'USDA / NOP', 'EPA', 'DOL / OSHA', 'Federal Register', 'State Ag Departments']
const AGENCIES_AU = ['FSANZ', 'APVMA', 'DAFF', 'Fair Work', 'State DPI', 'AQIS / Biosecurity']

type View = 'signup' | 'signin' | 'check-email'

export default function LandingPage() {
  const [country, setCountry] = useState<'US' | 'AU'>('US')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [form, setForm] = useState({ email: '', farm_name: '', name: '', state: '', acreage: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('signup')
  const [signInEmail, setSignInEmail] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('farmregs_country') as 'US' | 'AU' | null
    if (saved === 'US' || saved === 'AU') setCountry(saved)
  }, [])

  const handleCountryChange = (c: 'US' | 'AU') => {
    setCountry(c)
    localStorage.setItem('farmregs_country', c)
    setSelectedTypes([])
    setForm(prev => ({ ...prev, state: '' }))
  }

  const farmTypes = country === 'AU' ? AU_FARM_TYPES : US_FARM_TYPES
  const states = country === 'AU' ? AU_STATES : US_STATES
  const isAU = country === 'AU'

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

      const supabase = createSupabaseBrowser()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (otpError) throw otpError
      setView('check-email')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInEmail) { setError('Please enter your email.'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createSupabaseBrowser()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: signInEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (otpError) throw otpError
      setView('check-email')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const email = signInEmail || form.email
    if (!email) return
    setLoading(true)
    try {
      const supabase = createSupabaseBrowser()
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-[var(--straw)]/30 bg-white rounded px-4 py-3 text-[var(--soil)] font-[family-name:var(--font-body)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/40 focus:border-[var(--sage)] placeholder:text-[var(--straw)]/50 transition-colors'
  const labelClass = 'block font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--soil)]/60 mb-2'

  return (
    <div className="min-h-screen bg-[var(--parchment)]">
      {/* ─── TOPBAR ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[var(--soil)] text-[var(--wheat)] flex items-center px-6">
        <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-heading)] font-bold text-lg tracking-tight">FarmRegs</span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--straw)]/60 hidden sm:inline">Compliance Intelligence</span>
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
            <button
              onClick={() => handleCountryChange('US')}
              className={`px-4 py-1.5 rounded-full font-[family-name:var(--font-mono)] text-xs tracking-wide transition-all ${
                country === 'US' ? 'bg-[var(--wheat)] text-[var(--soil)]' : 'text-[var(--straw)]/60 hover:text-[var(--wheat)]'
              }`}
            >
              United States
            </button>
            <button
              onClick={() => handleCountryChange('AU')}
              className={`px-4 py-1.5 rounded-full font-[family-name:var(--font-mono)] text-xs tracking-wide transition-all ${
                country === 'AU' ? 'bg-[var(--wheat)] text-[var(--soil)]' : 'text-[var(--straw)]/60 hover:text-[var(--wheat)]'
              }`}
            >
              Australia
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO (two-column) ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-screen pt-14">
        {/* LEFT — dark panel */}
        <div className="bg-[var(--soil)] text-[var(--wheat)] px-8 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
          <div className="max-w-lg mx-auto lg:mx-0 lg:ml-auto">
            {/* Eyebrow */}
            <div className="flex items-center gap-4 mb-10">
              <div className="h-px flex-1 bg-[var(--straw)]/20" />
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--straw)]/60">
                {isAU ? 'Federal + State Regulation Tracking — AU' : 'Federal + State Regulation Tracking'}
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-[family-name:var(--font-heading)] text-[40px] lg:text-[48px] leading-[1.15] font-bold mb-6">
              Know exactly what regulations apply to your farm.
            </h1>

            {/* Subhead */}
            <p className="font-[family-name:var(--font-body)] font-light text-base leading-relaxed text-[var(--wheat)]/65 mb-10 max-w-md">
              {isAU
                ? 'Track FSANZ, APVMA, DAFF biosecurity, and state-specific requirements. Built for Australian farmers.'
                : 'Track certifications, permits, and federal requirements. Never miss a deadline or compliance update.'}
            </p>

            {/* Bullet points */}
            <div className="space-y-3 mb-12">
              {(isAU ? [
                'FSANZ & food safety standards',
                'APVMA chemical registration',
                'DAFF biosecurity & export',
                'NLIS livestock identification',
              ] : [
                'FSMA & FDA compliance',
                'USDA organic certification tracking',
                'EPA & state environmental rules',
                'Labor law requirements',
              ]).map(item => (
                <div key={item} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--sage-light)] shrink-0" />
                  <span className="font-[family-name:var(--font-body)] text-sm text-[var(--wheat)]/80">{item}</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="border-t border-[var(--straw)]/15 pt-8">
              <div className="grid grid-cols-3 gap-6">
                {(isAU ? [
                  { num: '10+', label: 'Regulations tracked' },
                  { num: 'All 8', label: 'States & territories' },
                  { num: 'Live', label: 'Change monitoring' },
                ] : [
                  { num: '50+', label: 'Regulations tracked' },
                  { num: 'All 50', label: 'States covered' },
                  { num: 'Live', label: 'Change monitoring' },
                ]).map(stat => (
                  <div key={stat.label}>
                    <div className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--wheat)]">{stat.num}</div>
                    <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--straw)]/50 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — light panel (form) */}
        <div className="bg-[var(--parchment)] px-8 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
          <div className="max-w-md mx-auto lg:mx-0 w-full">

            {/* Check Email View */}
            {view === 'check-email' && (
              <div className="text-center py-12">
                <div className="mb-6 flex justify-center">
                  <IconMail />
                </div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--soil)] mb-3">Check your email</h2>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--soil)]/60 mb-2">
                  We sent a magic link to <strong className="text-[var(--soil)]">{signInEmail || form.email}</strong>
                </p>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--soil)]/40 mb-8">No password needed. Just click the link.</p>
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--sage)] hover:text-[var(--soil)] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : "Didn't get it? Resend"}
                </button>
                <div className="mt-8 pt-6 border-t border-[var(--straw)]/20">
                  <button
                    onClick={() => { setView('signup'); setError('') }}
                    className="font-[family-name:var(--font-mono)] text-xs text-[var(--soil)]/40 hover:text-[var(--soil)]/70 transition-colors"
                  >
                    Back to sign up
                  </button>
                </div>
              </div>
            )}

            {/* Sign-In View */}
            {view === 'signin' && (
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--soil)] mb-2">Welcome back</h2>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--soil)]/50 mb-8">Enter your email and we&apos;ll send you a magic link.</p>

                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      placeholder="john@myfarm.com"
                      value={signInEmail}
                      onChange={e => setSignInEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200/60 rounded px-4 py-3 text-red-700 text-sm">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--soil)] text-[var(--wheat)] py-3.5 rounded font-[family-name:var(--font-body)] font-medium text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-[var(--bark)] disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Sending link...' : 'Send magic link'}
                    {!loading && <IconArrowRight />}
                  </button>

                  <p className="text-center font-[family-name:var(--font-body)] text-xs text-[var(--soil)]/40">
                    New here?{' '}
                    <button type="button" onClick={() => { setView('signup'); setError('') }} className="text-[var(--sage)] hover:underline">
                      Create an account
                    </button>
                  </p>
                </form>
              </div>
            )}

            {/* Sign-Up View */}
            {view === 'signup' && (
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--soil)] mb-1">Get your compliance dashboard</h2>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--soil)]/50 mb-6">Free. No password required.</p>
                <div className="h-px bg-[var(--straw)]/20 mb-6" />

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Farm Types */}
                  <div>
                    <label className={labelClass}>Farm Type *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {farmTypes.map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleType(type.id)}
                          className={`px-3 py-2.5 rounded text-sm font-[family-name:var(--font-body)] font-medium transition-all border ${
                            selectedTypes.includes(type.id)
                              ? 'bg-[var(--sage-pale)] border-[var(--sage)] text-[var(--soil)]'
                              : 'bg-white border-[var(--straw)]/20 text-[var(--soil)]/60 hover:border-[var(--straw)]/40'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* State */}
                  <div>
                    <label className={labelClass}>{isAU ? 'State / Territory' : 'State'} *</label>
                    <div className="relative">
                      <select
                        value={form.state}
                        onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        <option value="">{isAU ? 'Select state/territory...' : 'Select your state...'}</option>
                        {isAU
                          ? AU_STATES.map(s => <option key={s} value={s}>{AU_STATE_LABELS[s]} ({s})</option>)
                          : US_STATES.map(s => <option key={s} value={s}>{s}</option>)
                        }
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--straw)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Farm Name + Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Farm Name *</label>
                      <input
                        type="text"
                        placeholder={isAU ? 'Outback Station' : 'Sunshine Farms'}
                        value={form.farm_name}
                        onChange={e => setForm(prev => ({ ...prev, farm_name: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Your Name</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        value={form.name}
                        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Email + Acreage */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input
                        type="email"
                        placeholder="john@myfarm.com"
                        value={form.email}
                        onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{isAU ? 'Hectares' : 'Acreage'}</label>
                      <input
                        type="number"
                        placeholder={isAU ? '100' : '250'}
                        value={form.acreage}
                        onChange={e => setForm(prev => ({ ...prev, acreage: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200/60 rounded px-4 py-3 text-red-700 text-sm">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--soil)] text-[var(--wheat)] py-3.5 rounded font-[family-name:var(--font-body)] font-medium text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-[var(--bark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Setting up your dashboard...' : 'Get my compliance dashboard'}
                    {!loading && <IconArrowRight />}
                  </button>

                  <p className="text-center font-[family-name:var(--font-body)] text-xs text-[var(--soil)]/40">
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setView('signin'); setError('') }} className="text-[var(--sage)] hover:underline">
                      Sign in
                    </button>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── AGENCY STRIP ─── */}
      <section className="bg-[var(--soil)] py-5 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center gap-4">
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--straw)]/40 shrink-0">Regulations from</span>
          <div className="flex flex-wrap gap-2">
            {(isAU ? AGENCIES_AU : AGENCIES_US).map(agency => (
              <span
                key={agency}
                className="px-3 py-1 rounded-full border border-[var(--straw)]/15 font-[family-name:var(--font-mono)] text-[11px] text-[var(--straw)]/60 tracking-wide"
              >
                {agency}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="bg-[var(--parchment)] py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--straw)]/15">
            {[
              {
                icon: <IconDocument />,
                title: 'Document Vault',
                desc: 'Store all your certifications, permits, and licenses in one place. Get 90/60/30 day expiry reminders.',
              },
              {
                icon: <IconBell />,
                title: 'Regulation Alerts',
                desc: isAU
                  ? 'Instant notifications when FSANZ, APVMA, DAFF, or state regulations that affect your farm change.'
                  : 'Instant notifications when FDA, USDA, or EPA regulations that affect your farm type change.',
              },
              {
                icon: <IconHelp />,
                title: 'AI Assistant',
                desc: 'Ask any compliance question and get specific answers about your farm type, state, and operations.',
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`group px-8 py-8 md:py-0 hover:bg-white transition-colors ${i === 0 ? 'md:pl-0' : ''} ${i === 2 ? 'md:pr-0' : ''}`}
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--sage-pale)] text-[var(--sage)] flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--soil)] mb-2">{f.title}</h3>
                <p className="font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--soil)]/50">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[var(--bark)] py-6 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--straw)]/40 tracking-wide">
            FarmRegs &copy; {new Date().getFullYear()}
          </span>
          <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--straw)]/30">
            Not legal advice. Always consult a qualified attorney for compliance decisions.
          </span>
        </div>
      </footer>
    </div>
  )
}
