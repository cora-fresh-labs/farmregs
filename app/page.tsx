'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

// --- SVG Icons (navy stroke, 28px for features) ---
const IconDocument = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const IconBell = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const IconHelp = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ocean)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

const IconCheckTeal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  )
}

function LandingContent() {
  const [country, setCountry] = useState<'US' | 'AU'>('US')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [form, setForm] = useState({ email: '', farm_name: '', name: '', state: '', acreage: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('signup')
  const [signInEmail, setSignInEmail] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchParams = useSearchParams()

  const startCooldown = useCallback(() => {
    setCooldown(60)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('farmregs_country') as 'US' | 'AU' | null
    if (saved === 'US' || saved === 'AU') setCountry(saved)
  }, [])

  // Google OAuth redirect — user has no profile yet, pre-fill email
  useEffect(() => {
    if (searchParams.get('setup') === 'true') {
      setView('signup')
      const supabase = createSupabaseBrowser()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setForm(prev => ({ ...prev, email: user.email! }))
        }
      })
    }
  }, [searchParams])

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
      const supabase = createSupabaseBrowser()

      // Check if already authenticated (Google OAuth setup flow)
      const { data: { user: existingUser } } = await supabase.auth.getUser()

      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, farm_type: selectedTypes, country, user_id: existingUser?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')

      // If already authenticated via Google, go straight to dashboard
      if (existingUser) {
        window.location.href = '/dashboard'
        return
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (otpError) {
        if (otpError.status === 429) {
          setError('Too many requests. Please wait a minute before trying again.')
          startCooldown()
          return
        }
        throw otpError
      }
      startCooldown()
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
      if (otpError) {
        if (otpError.status === 429) {
          setError('Too many requests. Please wait a minute before trying again.')
          startCooldown()
          return
        }
        throw otpError
      }
      startCooldown()
      setView('check-email')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    const email = signInEmail || form.email
    if (!email) return
    setLoading(true)
    try {
      const supabase = createSupabaseBrowser()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (otpError && otpError.status === 429) {
        setError('Too many requests. Please wait a minute before trying again.')
      }
      startCooldown()
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const inputClass = 'w-full border border-[var(--rule)] bg-white rounded-lg px-4 py-3 text-[var(--ink)] font-[family-name:var(--font-body)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30 focus:border-[var(--ocean)] placeholder:text-[var(--muted)] transition-colors'
  const labelClass = 'block font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--slate)] mb-2'

  return (
    <div className="min-h-screen bg-[var(--white)]">
      {/* ─── TOPBAR ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-[var(--white)] border-b border-[var(--rule)] flex items-center px-6">
        <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-heading)] font-bold text-xl text-[var(--navy)]">FarmRegs</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ocean)]" />
          </div>

          {/* Country toggle — centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[var(--off)] rounded-full p-0.5">
            <button
              onClick={() => handleCountryChange('US')}
              className={`px-4 py-1.5 rounded-full font-[family-name:var(--font-mono)] text-xs tracking-wide transition-all ${
                country === 'US' ? 'bg-[var(--white)] text-[var(--navy)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--slate)]'
              }`}
            >
              United States
            </button>
            <button
              onClick={() => handleCountryChange('AU')}
              className={`px-4 py-1.5 rounded-full font-[family-name:var(--font-mono)] text-xs tracking-wide transition-all ${
                country === 'AU' ? 'bg-[var(--white)] text-[var(--navy)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--slate)]'
              }`}
            >
              Australia
            </button>
          </div>

          {/* Sign in link */}
          <button
            onClick={() => { setView('signin'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="font-[family-name:var(--font-body)] text-sm text-[var(--ocean)] hover:text-[var(--navy)] transition-colors"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* ─── HERO (two-column) ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-screen pt-[60px]">
        {/* LEFT — white panel */}
        <div className="bg-[var(--white)] px-8 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
          <div className="max-w-lg mx-auto lg:mx-0 lg:ml-auto">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-0.5 bg-[var(--ocean)]" />
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.15em] text-[var(--ocean)]">
                {isAU ? 'Federal + State Regulation Tracking' : 'Federal + State Regulation Tracking'}
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-[family-name:var(--font-heading)] text-[40px] lg:text-[48px] leading-[1.15] font-semibold text-[var(--navy)] mb-6">
              Know exactly what regulations apply to <em className="italic text-[var(--ocean)]">your</em> farm.
            </h1>

            {/* Subhead */}
            <p className="font-[family-name:var(--font-body)] font-light text-base leading-relaxed text-[var(--slate)] mb-10 max-w-md">
              {isAU
                ? 'Track FSANZ, APVMA, DAFF biosecurity, and state-specific requirements. Built for Australian farmers.'
                : 'Track certifications, permits, and federal requirements. Never miss a deadline or compliance update.'}
            </p>

            {/* Teal checkmark bullet points */}
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
                  <IconCheckTeal />
                  <span className="font-[family-name:var(--font-body)] text-sm text-[var(--ink)]">{item}</span>
                </div>
              ))}
            </div>

            {/* Stats row with vertical rules */}
            <div className="flex items-center gap-0">
              {(isAU ? [
                { num: '10+', label: 'Regulations tracked' },
                { num: 'All 8', label: 'States & territories' },
                { num: 'Live', label: 'Change monitoring' },
              ] : [
                { num: '50+', label: 'Regulations tracked' },
                { num: 'All 50', label: 'States covered' },
                { num: 'Live', label: 'Change monitoring' },
              ]).map((stat, i) => (
                <div key={stat.label} className={`flex-1 ${i > 0 ? 'border-l border-[var(--rule)] pl-6' : ''} ${i < 2 ? 'pr-6' : ''}`}>
                  <div className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--navy)]">{stat.num}</div>
                  <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--muted)] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — off-white panel (form) */}
        <div className="bg-[var(--off)] px-8 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
          <div className="max-w-md mx-auto lg:mx-0 w-full">

            {/* Check Email View */}
            {view === 'check-email' && (
              <div className="text-center py-12">
                <div className="mb-6 flex justify-center">
                  <IconMail />
                </div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--navy)] mb-3">Check your email</h2>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--slate)] mb-2">
                  We sent a magic link to <strong className="text-[var(--ink)]">{signInEmail || form.email}</strong>
                </p>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--muted)] mb-2">No password needed. Just click the link.</p>
                <p className="font-[family-name:var(--font-body)] text-xs text-[var(--muted)] mb-2">
                  Link expires in 10 minutes.
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-[var(--muted)] mb-8">
                  Not in your inbox? Check your spam or promotions folder.
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200/60 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">{error}</div>
                )}

                <button
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                  className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--ocean)] hover:text-[var(--navy)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't get it? Resend"}
                </button>
                <div className="mt-8 pt-6 border-t border-[var(--rule)]">
                  <button
                    onClick={() => { setView('signup'); setError(''); setCooldown(0) }}
                    className="font-[family-name:var(--font-mono)] text-xs text-[var(--muted)] hover:text-[var(--slate)] transition-colors"
                  >
                    Back to sign up
                  </button>
                </div>
              </div>
            )}

            {/* Sign-In View */}
            {view === 'signin' && (
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--navy)] mb-2">Welcome back</h2>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--slate)] mb-8">Sign in to your compliance dashboard.</p>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 border border-[var(--rule)] bg-[var(--white)] rounded-lg px-4 py-3 text-sm font-[family-name:var(--font-body)] font-medium text-[var(--ink)] hover:bg-gray-50 transition-colors mb-6"
                >
                  <IconGoogle />
                  Sign in with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-[var(--rule)]" />
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted)]">or</span>
                  <div className="flex-1 h-px bg-[var(--rule)]" />
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
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
                    <div className="bg-red-50 border border-red-200/60 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--navy)] text-white py-3.5 rounded-lg font-[family-name:var(--font-body)] font-medium text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-[var(--navy-deep)] disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Sending link...' : 'Send magic link'}
                    {!loading && <IconArrowRight />}
                  </button>

                  <p className="text-center font-[family-name:var(--font-body)] text-xs text-[var(--muted)]">
                    New here?{' '}
                    <button type="button" onClick={() => { setView('signup'); setError('') }} className="text-[var(--ocean)] hover:underline">
                      Create an account
                    </button>
                  </p>
                </form>
              </div>
            )}

            {/* Sign-Up View */}
            {view === 'signup' && (
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--navy)] mb-1">Get your compliance dashboard</h2>
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--slate)] mb-6">Free. No password required.</p>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 border border-[var(--rule)] bg-[var(--white)] rounded-lg px-4 py-3 text-sm font-[family-name:var(--font-body)] font-medium text-[var(--ink)] hover:bg-gray-50 transition-colors mb-6"
                >
                  <IconGoogle />
                  Sign in with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-[var(--rule)]" />
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted)]">or continue with email</span>
                  <div className="flex-1 h-px bg-[var(--rule)]" />
                </div>

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
                          className={`px-3 py-2.5 rounded-lg text-sm font-[family-name:var(--font-body)] font-medium transition-all border ${
                            selectedTypes.includes(type.id)
                              ? 'bg-[var(--navy)] border-[var(--navy)] text-white'
                              : 'bg-[var(--white)] border-[var(--rule)] text-[var(--slate)] hover:border-[var(--muted)]'
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
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    <div className="bg-red-50 border border-red-200/60 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--navy)] text-white py-3.5 rounded-lg font-[family-name:var(--font-body)] font-medium text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-[var(--navy-deep)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Setting up your dashboard...' : 'Get my compliance dashboard'}
                    {!loading && <IconArrowRight />}
                  </button>

                  <p className="text-center font-[family-name:var(--font-body)] text-xs text-[var(--muted)]">
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setView('signin'); setError('') }} className="text-[var(--ocean)] hover:underline">
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
      <section className="bg-[var(--navy)] py-5 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center gap-4">
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-white/40 shrink-0">Regulations from</span>
          <div className="flex flex-wrap gap-2">
            {(isAU ? AGENCIES_AU : AGENCIES_US).map(agency => (
              <span
                key={agency}
                className="px-3 py-1 rounded-full border border-white/15 font-[family-name:var(--font-mono)] text-[11px] text-white/60 tracking-wide"
              >
                {agency}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="bg-[var(--white)] py-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-0.5 bg-[var(--ocean)]" />
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.15em] text-[var(--ocean)]">
              What you get
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
            ].map(f => (
              <div
                key={f.title}
                className="group p-6 rounded-xl border border-[var(--rule)] hover:border-[var(--ocean)]/30 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--off)] flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--navy)] mb-2">{f.title}</h3>
                <p className="font-[family-name:var(--font-body)] text-sm leading-relaxed text-[var(--slate)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[var(--off)] border-t border-[var(--rule)] py-6 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--muted)] tracking-wide">
            FarmRegs &copy; {new Date().getFullYear()}
          </span>
          <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--muted)]/60">
            Not legal advice. Always consult a qualified attorney for compliance decisions.
          </span>
        </div>
      </footer>
    </div>
  )
}
