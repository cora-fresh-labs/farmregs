'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import ChatWidget from '@/components/ChatWidget'
import ChecklistSection from '@/components/ChecklistSection'
import type { FarmProfile, FarmDocument, FarmRegulation, FarmAlert, Market } from '@/lib/supabase'

type DashboardData = {
  profile: FarmProfile
  documents: FarmDocument[]
  regulations: FarmRegulation[]
  alerts: FarmAlert[]
  pinnedMarket: (Market & { state: { abbr: string; name: string } }) | null
  checklistItems: ChecklistItem[] | null
}

type ChecklistItem = {
  id: string
  section: string
  title: string
  description: string | null
  priority: string
  is_checked: boolean
}

function DaysUntil({ date }: { date: string }) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return <span className="text-red-600 font-semibold">Expired {Math.abs(days)}d ago</span>
  if (days <= 30) return <span className="text-amber-600 font-semibold">Expires in {days}d</span>
  return <span className="text-[var(--teal)]">Exp. {new Date(date).toLocaleDateString()}</span>
}

function ComplianceScore({ documents, alerts, checklistItems }: {
  documents: FarmDocument[]
  alerts: FarmAlert[]
  checklistItems: ChecklistItem[] | null
}) {
  const expired = documents.filter(d => d.status === 'expired').length
  const expiringSoon = documents.filter(d => d.status === 'expiring_soon').length
  const unreadCritical = alerts.filter(a => a.status === 'unread').length

  let docScore = 100
  docScore -= expired * 15
  docScore -= expiringSoon * 8
  docScore = Math.max(0, Math.min(100, docScore))

  let alertScore = 100
  alertScore -= unreadCritical * 5
  alertScore = Math.max(0, Math.min(100, alertScore))

  let checklistScore = 100
  if (checklistItems && checklistItems.length > 0) {
    let totalWeight = 0
    let checkedWeight = 0
    for (const item of checklistItems) {
      const weight = item.priority === 'high' ? 2 : 1
      totalWeight += weight
      if (item.is_checked) checkedWeight += weight
    }
    checklistScore = totalWeight > 0 ? Math.round((checkedWeight / totalWeight) * 100) : 100
  }

  const hasChecklist = checklistItems && checklistItems.length > 0
  const score = hasChecklist
    ? Math.round(docScore * 0.4 + alertScore * 0.1 + checklistScore * 0.5)
    : Math.round(docScore * 0.85 + alertScore * 0.15)

  const color = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-3">
      <div className={`font-[family-name:var(--font-heading)] text-3xl font-bold ${color}`}>{score}/100</div>
      <div className="text-sm text-white/60 font-[family-name:var(--font-body)]">
        {score >= 80 ? 'Good standing' : score >= 60 ? 'Needs attention' : 'Action required'}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--white)]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--navy)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--slate)] font-[family-name:var(--font-body)]">Loading your compliance dashboard...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[var(--white)]">
      <Header />
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-xl font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)] mb-2">Farm profile not found</h2>
          <p className="text-[var(--slate)] font-[family-name:var(--font-body)] mb-6">{error || 'Please sign up first to access your dashboard.'}</p>
          <Link href="/" className="inline-block bg-[var(--navy)] text-white px-6 py-3 rounded-lg font-[family-name:var(--font-body)] font-medium hover:bg-[var(--navy-deep)]">Back to sign up</Link>
        </div>
      </div>
    </div>
  )

  const { profile, documents, regulations, alerts, pinnedMarket, checklistItems } = data
  const farmTypeLabels: Record<string, string> = {
    row_crop: 'Row Crops', livestock: 'Livestock', organic: 'Organic',
    dairy: 'Dairy', specialty_crop: 'Specialty Crop', aquaculture: 'Aquaculture',
    grain_broadacre: 'Grain/Broadacre', horticulture: 'Horticulture',
    viticulture: 'Viticulture', mixed: 'Mixed',
  }

  const currentDocs = documents.filter(d => d.status === 'active')
  const expiringSoonDocs = documents.filter(d => d.status === 'expiring_soon')
  const expiredDocs = documents.filter(d => d.status === 'expired' || d.status === 'renewal_needed')
  const unreadAlerts = alerts.filter(a => a.status === 'unread')

  return (
    <div className="min-h-screen bg-[var(--white)]">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Farm Header */}
        <div className="bg-[var(--navy)] rounded-2xl text-white p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold">{profile.farm_name || 'Your Farm'}</h1>
              <p className="text-white/50 mt-1 font-[family-name:var(--font-body)]">
                {profile.state} · {profile.farm_type?.map(t => farmTypeLabels[t] || t).join(', ')}
                {profile.acreage ? ` · ${profile.acreage} acres` : ''}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1 font-[family-name:var(--font-mono)]">Compliance Score</p>
              <ComplianceScore documents={documents} alerts={unreadAlerts} checklistItems={checklistItems} />
            </div>
          </div>
        </div>

        {/* Pinned Market Section */}
        {pinnedMarket ? (
          <div className="bg-white rounded-xl border border-[var(--rule)] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)]">Your Market</h2>
              <Link
                href={`/regulations/${(pinnedMarket.state as { abbr: string }).abbr.toLowerCase()}/${pinnedMarket.slug}`}
                className="text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]"
              >
                View full details
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--off)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ocean)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[var(--ink)] font-[family-name:var(--font-body)]">{pinnedMarket.name}</p>
                <p className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)]">
                  {(pinnedMarket.state as { name: string }).name}
                  {pinnedMarket.county && ` · ${pinnedMarket.county} County`}
                  {pinnedMarket.status && (
                    <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      pinnedMarket.status === 'Unrestricted' ? 'bg-emerald-100 text-emerald-800' :
                      pinnedMarket.status === 'Permit Required' ? 'bg-amber-100 text-amber-800' :
                      pinnedMarket.status === 'Prohibited' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {pinnedMarket.status}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-[var(--rule)] p-6 mb-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--off)] flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ocean)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <p className="text-[var(--ink)] font-[family-name:var(--font-body)] font-medium mb-1">Set your local market</p>
            <p className="text-sm text-[var(--muted)] font-[family-name:var(--font-body)] mb-4">Pin your market to get personalized regulations and a compliance checklist.</p>
            <Link
              href="/regulations"
              className="inline-block bg-[var(--navy)] text-white px-5 py-2.5 rounded-lg text-sm font-[family-name:var(--font-body)] font-medium hover:bg-[var(--navy-deep)]"
            >
              Browse regulations map
            </Link>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-[var(--rule)] text-center">
            <div className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[var(--navy)]">{currentDocs.length}</div>
            <div className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)] mt-1">Current Documents</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-[var(--rule)] text-center">
            <div className="font-[family-name:var(--font-heading)] text-3xl font-bold text-amber-500">{expiringSoonDocs.length}</div>
            <div className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)] mt-1">Expiring Soon</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-[var(--rule)] text-center">
            <div className="font-[family-name:var(--font-heading)] text-3xl font-bold text-red-500">{expiredDocs.length}</div>
            <div className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)] mt-1">Overdue Renewals</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Compliance Checklist */}
            {checklistItems && checklistItems.length > 0 && (
              <ChecklistSection items={checklistItems} onToggle={(id, checked) => {
                setData(prev => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    checklistItems: prev.checklistItems?.map(item =>
                      item.id === id ? { ...item, is_checked: checked } : item
                    ) ?? null,
                  }
                })
              }} />
            )}

            {/* Active Alerts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)]">
                  Active Alerts
                  {unreadAlerts.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadAlerts.length}</span>}
                </h2>
              </div>
              {unreadAlerts.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border border-[var(--rule)] text-center text-[var(--muted)]">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="font-[family-name:var(--font-body)]">No active alerts — your farm looks compliant!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unreadAlerts.map(alert => (
                    <div key={alert.id} className="bg-white rounded-xl p-5 border border-[var(--rule)]">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          alert.alert_type === 'doc_expiring' ? 'bg-amber-100' : 'bg-[var(--ocean)]/10'
                        }`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={alert.alert_type === 'doc_expiring' ? '#d97706' : 'var(--ocean)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[var(--ink)] font-[family-name:var(--font-body)]">{alert.title}</p>
                          {alert.description && <p className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)] mt-1">{alert.description}</p>}
                          {alert.action_required && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 font-[family-name:var(--font-body)]">
                              <strong>Action required:</strong> {alert.action_required}
                            </div>
                          )}
                          {alert.due_date && (
                            <p className="text-xs text-red-600 mt-2 font-[family-name:var(--font-mono)]">Due: {new Date(alert.due_date).toLocaleDateString()}</p>
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
                <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)]">Your Regulations ({regulations.length} applicable)</h2>
                <Link href="/regulations" className="text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]">View all</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {regulations.map(reg => (
                  <span
                    key={reg.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-[family-name:var(--font-body)] font-medium border ${
                      reg.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                      reg.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-[var(--off)] border-[var(--rule)] text-[var(--slate)]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      reg.severity === 'critical' ? 'bg-red-500' :
                      reg.severity === 'warning' ? 'bg-amber-500' : 'bg-[var(--ocean)]'
                    }`} />
                    {reg.title}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Document Vault Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)]">Document Vault</h2>
              <Link href="/documents" className="text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]">Manage</Link>
            </div>
            {documents.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-dashed border-[var(--rule)] text-center">
                <div className="w-10 h-10 rounded-lg bg-[var(--off)] flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)] mb-4">No documents yet. Add your certifications and permits.</p>
                <Link href="/documents" className="text-sm text-[var(--ocean)] font-[family-name:var(--font-body)] font-medium hover:underline">+ Add document</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl p-4 border border-[var(--rule)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[var(--ink)] text-sm font-[family-name:var(--font-body)]">{doc.doc_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        doc.status === 'active' ? 'bg-[var(--teal)]/10 text-[var(--teal)]' :
                        doc.status === 'expiring_soon' ? 'bg-[var(--ocean)]/10 text-[var(--ocean)]' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] font-[family-name:var(--font-body)]">{doc.doc_type?.replace('_', ' ')}</p>
                    {doc.expiry_date && (
                      <p className="text-xs mt-1 font-[family-name:var(--font-body)]"><DaysUntil date={doc.expiry_date} /></p>
                    )}
                  </div>
                ))}
                <Link href="/documents" className="block text-center py-3 border-2 border-dashed border-[var(--rule)] rounded-xl text-sm text-[var(--muted)] hover:border-[var(--ocean)] hover:text-[var(--ocean)] transition-colors font-[family-name:var(--font-body)]">
                  + Add document
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 bg-[var(--off)] rounded-xl p-5 border border-[var(--rule)]">
              <h3 className="font-semibold text-[var(--navy)] mb-3 text-sm font-[family-name:var(--font-body)]">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/documents" className="flex items-center gap-2 text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Add certification or permit
                </Link>
                <Link href="/regulations" className="flex items-center gap-2 text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                  Browse regulations
                </Link>
                <button
                  onClick={() => fetch('/api/notify', { method: 'POST' })}
                  className="flex items-center gap-2 text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  Send compliance digest
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ChatWidget farmProfile={profile} />
    </div>
  )
}
