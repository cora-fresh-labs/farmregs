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
  return <span className="text-green-600">Exp. {new Date(date).toLocaleDateString()}</span>
}

function ComplianceScore({ documents, alerts, checklistItems }: {
  documents: FarmDocument[]
  alerts: FarmAlert[]
  checklistItems: ChecklistItem[] | null
}) {
  const expired = documents.filter(d => d.status === 'expired').length
  const expiringSoon = documents.filter(d => d.status === 'expiring_soon').length
  const unreadCritical = alerts.filter(a => a.status === 'unread').length

  // Doc score (0-100)
  let docScore = 100
  docScore -= expired * 15
  docScore -= expiringSoon * 8
  docScore = Math.max(0, Math.min(100, docScore))

  // Alert score (0-100)
  let alertScore = 100
  alertScore -= unreadCritical * 5
  alertScore = Math.max(0, Math.min(100, alertScore))

  // Checklist score (0-100)
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

  // Weighted composite
  const hasChecklist = checklistItems && checklistItems.length > 0
  const score = hasChecklist
    ? Math.round(docScore * 0.4 + alertScore * 0.1 + checklistScore * 0.5)
    : Math.round(docScore * 0.85 + alertScore * 0.15)

  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-3">
      <div className={`text-3xl font-bold ${color}`}>{score}/100</div>
      <div className="text-sm text-gray-500">
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
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f0]">
      <div className="text-center">
        <div className="text-5xl animate-bounce mb-4">🌾</div>
        <p className="text-gray-600">Loading your compliance dashboard...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[#faf7f0]">
      <Header />
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Farm profile not found</h2>
          <p className="text-gray-500 mb-6">{error || 'Please sign up first to access your dashboard.'}</p>
          <Link href="/" className="inline-block bg-[#2d6a4f] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1b4332]">Back to sign up</Link>
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
    <div className="min-h-screen bg-[#faf7f0]">
      <Header />

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
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-green-200 text-xs uppercase tracking-wide mb-1">Compliance Score</p>
              <ComplianceScore documents={documents} alerts={unreadAlerts} checklistItems={checklistItems} />
            </div>
          </div>
        </div>

        {/* Pinned Market Section */}
        {pinnedMarket ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Your Market</h2>
              <Link
                href={`/regulations/${(pinnedMarket.state as { abbr: string }).abbr.toLowerCase()}/${pinnedMarket.slug}`}
                className="text-sm text-[#2d6a4f] hover:underline"
              >
                View full details
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-semibold text-gray-900">{pinnedMarket.name}</p>
                <p className="text-sm text-gray-500">
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
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 mb-6 text-center">
            <div className="text-3xl mb-2">📍</div>
            <p className="text-gray-600 font-medium mb-1">Set your local market</p>
            <p className="text-sm text-gray-400 mb-4">Pin your market to get personalized regulations and a compliance checklist.</p>
            <Link
              href="/regulations"
              className="inline-block bg-[#2d6a4f] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1b4332]"
            >
              Browse regulations map
            </Link>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
            <div className="text-3xl font-bold text-green-600">{currentDocs.length}</div>
            <div className="text-sm text-gray-500 mt-1">Current Documents</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
            <div className="text-3xl font-bold text-amber-500">{expiringSoonDocs.length}</div>
            <div className="text-sm text-gray-500 mt-1">Expiring Soon</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
            <div className="text-3xl font-bold text-red-500">{expiredDocs.length}</div>
            <div className="text-sm text-gray-500 mt-1">Overdue Renewals</div>
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
                <Link href="/regulations" className="text-sm text-[#2d6a4f] hover:underline">View all</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {regulations.map(reg => (
                  <span
                    key={reg.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
                      reg.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                      reg.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    {reg.severity === 'critical' ? '🔴' : reg.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    {reg.title}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Document Vault Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Document Vault</h2>
              <Link href="/documents" className="text-sm text-[#2d6a4f] hover:underline">Manage</Link>
            </div>
            {documents.length === 0 ? (
              <div className="bg-white rounded-xl p-6 border border-dashed border-gray-200 text-center">
                <div className="text-3xl mb-3">📁</div>
                <p className="text-sm text-gray-500 mb-4">No documents yet. Add your certifications and permits.</p>
                <Link href="/documents" className="text-sm text-[#2d6a4f] font-medium hover:underline">+ Add document</Link>
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
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{doc.doc_type?.replace('_', ' ')}</p>
                    {doc.expiry_date && (
                      <p className="text-xs mt-1"><DaysUntil date={doc.expiry_date} /></p>
                    )}
                  </div>
                ))}
                <Link href="/documents" className="block text-center py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">
                  + Add document
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 bg-[#f0faf5] rounded-xl p-5 border border-green-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/documents" className="flex items-center gap-2 text-sm text-[#2d6a4f] hover:underline">
                  📄 Add certification or permit
                </Link>
                <Link href="/regulations" className="flex items-center gap-2 text-sm text-[#2d6a4f] hover:underline">
                  📋 Browse regulations
                </Link>
                <button
                  onClick={() => fetch('/api/notify', { method: 'POST' })}
                  className="flex items-center gap-2 text-sm text-[#2d6a4f] hover:underline"
                >
                  📧 Send compliance digest
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
