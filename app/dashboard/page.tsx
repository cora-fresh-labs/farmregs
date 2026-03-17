'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ChatWidget from '@/components/ChatWidget'
import type { FarmProfile, FarmDocument, FarmRegulation, FarmAlert } from '@/lib/supabase'

type DashboardData = {
  profile: FarmProfile
  documents: FarmDocument[]
  regulations: FarmRegulation[]
  alerts: FarmAlert[]
}

function DaysUntil({ date }: { date: string }) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return <span className="text-red-600 font-semibold">Expired {Math.abs(days)}d ago</span>
  if (days <= 30) return <span className="text-amber-600 font-semibold">Expires in {days}d</span>
  return <span className="text-green-600">Exp. {new Date(date).toLocaleDateString()}</span>
}

function ComplianceScore({ documents, alerts }: { documents: FarmDocument[], alerts: FarmAlert[] }) {
  const expired = documents.filter(d => d.status === 'expired').length
  const expiringSoon = documents.filter(d => d.status === 'expiring_soon').length
  const unreadCritical = alerts.filter(a => a.status === 'unread').length

  let score = 100
  score -= expired * 15
  score -= expiringSoon * 8
  score -= unreadCritical * 5
  score = Math.max(0, Math.min(100, score))

  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-3">
      <div className={`text-3xl font-bold ${color}`}>{score}/100</div>
      <div className="text-sm text-gray-500">
        {score >= 80 ? '✅ Good standing' : score >= 60 ? '⚠️ Needs attention' : '🔴 Action required'}
      </div>
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!email) {
      router.push('/')
      return
    }
    fetch(`/api/dashboard?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [email, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f0]">
      <div className="text-center">
        <div className="text-5xl animate-bounce mb-4">🌾</div>
        <p className="text-gray-600">Loading your compliance dashboard...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f0]">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Farm profile not found</h2>
        <p className="text-gray-500 mb-6">{error || 'Please sign up first to access your dashboard.'}</p>
        <Link href="/" className="btn-primary">← Back to sign up</Link>
      </div>
    </div>
  )

  const { profile, documents, regulations, alerts } = data
  const farmTypeLabels: Record<string, string> = {
    row_crop: 'Row Crops', livestock: 'Livestock', organic: 'Organic',
    dairy: 'Dairy', specialty_crop: 'Specialty Crop', aquaculture: 'Aquaculture'
  }

  const currentDocs = documents.filter(d => d.status === 'active')
  const expiringSoonDocs = documents.filter(d => d.status === 'expiring_soon')
  const expiredDocs = documents.filter(d => d.status === 'expired' || d.status === 'renewal_needed')
  const unreadAlerts = alerts.filter(a => a.status === 'unread')

  const categoryColors: Record<string, string> = {
    food_safety: 'bg-orange-100 text-orange-700',
    environmental: 'bg-blue-100 text-blue-700',
    labor: 'bg-purple-100 text-purple-700',
    certification: 'bg-green-100 text-green-700',
    reporting: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      {/* Header */}
      <header className="bg-[#1b4332] text-white py-4 px-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <span className="text-xl font-bold">FarmRegs</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href={`/dashboard?email=${encodeURIComponent(email!)}`} className="text-white font-medium">Dashboard</Link>
            <Link href={`/documents?email=${encodeURIComponent(email!)}`} className="text-green-200 hover:text-white">Documents</Link>
            <Link href={`/regulations?email=${encodeURIComponent(email!)}`} className="text-green-200 hover:text-white">Regulations</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Farm Header */}
        <div className="bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] rounded-2xl text-white p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{profile.farm_name || 'Your Farm'}</h1>
              <p className="text-green-200 mt-1">
                {profile.state} · {profile.farm_type?.map(t => farmTypeLabels[t] || t).join(', ')} 
                {profile.acreage ? ` · ${profile.acreage} acres` : ''}
              </p>
              <p className="text-green-300 text-sm mt-1">{profile.email}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-green-200 text-xs uppercase tracking-wide mb-1">Compliance Score</p>
              <ComplianceScore documents={documents} alerts={unreadAlerts} />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
            <div className="text-3xl font-bold text-green-600">{currentDocs.length}</div>
            <div className="text-sm text-gray-500 mt-1">✅ Current Documents</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
            <div className="text-3xl font-bold text-amber-500">{expiringSoonDocs.length}</div>
            <div className="text-sm text-gray-500 mt-1">⚠️ Expiring Soon</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
            <div className="text-3xl font-bold text-red-500">{expiredDocs.length}</div>
            <div className="text-sm text-gray-500 mt-1">🔴 Overdue Renewals</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Active Alerts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Active Alerts {unreadAlerts.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadAlerts.length}</span>}</h2>
              </div>
              {unreadAlerts.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border border-gray-100 text-center text-gray-400">
                  <div className="text-3xl mb-2">✅</div>
                  <p>No active alerts — your farm looks compliant!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unreadAlerts.map(alert => (
                    <div key={alert.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{alert.alert_type === 'reg_change' ? '📢' : alert.alert_type === 'doc_expiring' ? '⏰' : '⚠️'}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{alert.title}</p>
                          {alert.description && <p className="text-sm text-gray-500 mt-1">{alert.description}</p>}
                          {alert.action_required && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                              <strong>Action required:</strong> {alert.action_required}
                            </div>
                          )}
                          {alert.due_date && (
                            <p className="text-xs text-red-600 mt-2">Due: {new Date(alert.due_date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Applicable Regulations */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Your Regulations ({regulations.length} applicable)</h2>
                <Link href={`/regulations?email=${encodeURIComponent(email!)}`} className="text-sm text-[#2d6a4f] hover:underline">View all →</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {regulations.map(reg => (
                  <Link
                    key={reg.id}
                    href={`/regulations?email=${encodeURIComponent(email!)}&id=${reg.id}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      reg.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' :
                      reg.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' :
                      'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {reg.severity === 'critical' ? '🔴' : reg.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    {reg.title}
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Document Vault Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Document Vault</h2>
              <Link href={`/documents?email=${encodeURIComponent(email!)}`} className="text-sm text-[#2d6a4f] hover:underline">Manage →</Link>
            </div>
            {documents.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-dashed border-gray-200 text-center">
                <div className="text-3xl mb-3">📁</div>
                <p className="text-sm text-gray-500 mb-4">No documents yet. Add your certifications and permits.</p>
                <Link href={`/documents?email=${encodeURIComponent(email!)}`} className="text-sm text-[#2d6a4f] font-medium hover:underline">+ Add document</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm">{doc.doc_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        doc.status === 'active' ? 'bg-green-100 text-green-700' :
                        doc.status === 'expiring_soon' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {doc.status === 'active' ? '✅' : doc.status === 'expiring_soon' ? '⚠️' : '🔴'}
                        {' '}{doc.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{doc.doc_type?.replace('_', ' ')}</p>
                    {doc.expiry_date && (
                      <p className="text-xs mt-1"><DaysUntil date={doc.expiry_date} /></p>
                    )}
                  </div>
                ))}
                <Link href={`/documents?email=${encodeURIComponent(email!)}`} className="block text-center py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">
                  + Add document
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 bg-[#f0faf5] rounded-xl p-5 border border-green-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                <Link href={`/documents?email=${encodeURIComponent(email!)}`} className="flex items-center gap-2 text-sm text-[#2d6a4f] hover:underline">
                  📄 Add certification or permit
                </Link>
                <Link href={`/regulations?email=${encodeURIComponent(email!)}`} className="flex items-center gap-2 text-sm text-[#2d6a4f] hover:underline">
                  📋 Browse your regulations
                </Link>
                <button
                  onClick={() => fetch('/api/notify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: email}) })}
                  className="flex items-center gap-2 text-sm text-[#2d6a4f] hover:underline"
                >
                  📧 Send compliance digest
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ChatWidget email={email!} farmProfile={profile} />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f0]">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-4">🌾</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
