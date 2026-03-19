'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import ChatWidget from '@/components/ChatWidget'
import type { FarmDocument, FarmProfile } from '@/lib/supabase'

const DOC_TYPES = [
  { id: 'organic_cert', label: 'Organic Certification', instructions: 'Contact your USDA-accredited certifier at least 3 months before expiry. Annual renewal required. Submit OSP update and any operation changes.' },
  { id: 'pesticide_license', label: 'Pesticide Applicator License', instructions: 'Apply for renewal through your state department of agriculture. Complete required CEU credits. Allow 4-6 weeks for processing.' },
  { id: 'water_permit', label: 'Water Permit / NPDES', instructions: 'Contact your state environmental agency or EPA regional office. May require water quality monitoring data and fee payment.' },
  { id: 'food_safety', label: 'Food Safety Plan (HARPC)', instructions: 'Update your Hazard Analysis and Risk-Based Preventive Controls plan. Review and update with any operation changes. Keep on file for 2 years.' },
  { id: 'gap_cert', label: 'GAP/GHP Certification', instructions: 'Schedule your annual USDA GAP audit through the USDA Agricultural Marketing Service. Prepare all records and documentation beforehand.' },
  { id: 'usda_registration', label: 'USDA Registration', instructions: 'Update your USDA registration through the relevant USDA agency (AMS, FSA, etc.). Ensure all operation information is current.' },
  { id: 'workers_comp', label: "Workers' Compensation", instructions: 'Renew policy with your insurance carrier before expiry. Ensure coverage meets state requirements for agricultural workers.' },
  { id: 'business_license', label: 'Business License', instructions: 'Renew with your county or state business office. Requirements vary by jurisdiction.' },
  { id: 'food_handler', label: 'Food Handler Permit', instructions: 'Complete required food safety training and apply for renewal through your local health department.' },
  { id: 'other', label: 'Other Permit/Certificate', instructions: 'Review the issuing agency requirements for renewal and contact them at least 60 days before expiry.' },
]

export default function DocumentsPage() {
  const [profile, setProfile] = useState<FarmProfile | null>(null)
  const [documents, setDocuments] = useState<FarmDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    doc_type: '',
    doc_name: '',
    expiry_date: '',
    issuing_body: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.profile) setProfile(d.profile)
        if (d.documents) setDocuments(d.documents)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !form.doc_type || !form.doc_name) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, farm_id: profile.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save document')
      if (data.document) {
        setDocuments(prev => [data.document, ...prev])
        setForm({ doc_type: '', doc_name: '', expiry_date: '', issuing_body: '', notes: '' })
        setShowForm(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return 'bg-[var(--teal)]/10 text-[var(--teal)]'
    if (status === 'expiring_soon') return 'bg-[var(--ocean)]/10 text-[var(--ocean)]'
    return 'bg-red-100 text-red-700'
  }

  const getDaysUntil = (date: string) => {
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  }

  const selectedDocType = DOC_TYPES.find(t => t.id === form.doc_type)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--white)]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--navy)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--slate)] font-[family-name:var(--font-body)]">Loading documents...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--white)]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--navy)]">Document Vault</h1>
            <p className="text-[var(--slate)] font-[family-name:var(--font-body)] mt-1">{profile?.farm_name} — track all certifications, permits, and licenses</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[var(--navy)] text-white px-5 py-2.5 rounded-lg font-[family-name:var(--font-body)] font-medium hover:bg-[var(--navy-deep)] transition-colors"
          >
            + Add Document
          </button>
        </div>

        {/* Expiry Summary Banners */}
        {documents.filter(d => d.status === 'expired' || d.status === 'renewal_needed').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div>
              <p className="font-semibold text-red-800 font-[family-name:var(--font-body)]">
                {documents.filter(d => d.status === 'expired').length} document(s) expired
              </p>
              <p className="text-sm text-red-600 font-[family-name:var(--font-body)]">Immediate renewal action required</p>
            </div>
          </div>
        )}
        {documents.filter(d => d.status === 'expiring_soon').length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <p className="font-semibold text-amber-800 font-[family-name:var(--font-body)]">
                {documents.filter(d => d.status === 'expiring_soon').length} document(s) expiring within 60 days
              </p>
              <p className="text-sm text-amber-600 font-[family-name:var(--font-body)]">Start renewal process now to avoid gaps</p>
            </div>
          </div>
        )}

        {/* Add Document Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 border border-[var(--rule)] mb-8">
            <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)] mb-5">Add New Document</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--ink)] mb-2 font-[family-name:var(--font-body)]">Document Type *</label>
                  <select
                    value={form.doc_type}
                    onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}
                    className="w-full border border-[var(--rule)] rounded-lg px-4 py-2.5 text-[var(--ink)] font-[family-name:var(--font-body)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30"
                    required
                  >
                    <option value="">Select type...</option>
                    {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--ink)] mb-2 font-[family-name:var(--font-body)]">Document Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., CCOF Organic Certificate 2025"
                    value={form.doc_name}
                    onChange={e => setForm(p => ({ ...p, doc_name: e.target.value }))}
                    className="w-full border border-[var(--rule)] rounded-lg px-4 py-2.5 text-[var(--ink)] font-[family-name:var(--font-body)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--ink)] mb-2 font-[family-name:var(--font-body)]">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                    className="w-full border border-[var(--rule)] rounded-lg px-4 py-2.5 text-[var(--ink)] font-[family-name:var(--font-body)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--ink)] mb-2 font-[family-name:var(--font-body)]">Issuing Body</label>
                  <input
                    type="text"
                    placeholder="e.g., CCOF, USDA AMS, California DPR"
                    value={form.issuing_body}
                    onChange={e => setForm(p => ({ ...p, issuing_body: e.target.value }))}
                    className="w-full border border-[var(--rule)] rounded-lg px-4 py-2.5 text-[var(--ink)] font-[family-name:var(--font-body)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--ink)] mb-2 font-[family-name:var(--font-body)]">Notes</label>
                <textarea
                  placeholder="Certificate number, renewal contact, notes..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-[var(--rule)] rounded-lg px-4 py-2.5 text-[var(--ink)] font-[family-name:var(--font-body)] focus:outline-none focus:ring-2 focus:ring-[var(--ocean)]/30"
                />
              </div>

              {selectedDocType && (
                <div className="bg-[var(--off)] border border-[var(--rule)] rounded-lg p-4">
                  <p className="text-sm font-semibold text-[var(--navy)] mb-1 font-[family-name:var(--font-body)]">Renewal Instructions</p>
                  <p className="text-sm text-[var(--slate)] font-[family-name:var(--font-body)]">{selectedDocType.instructions}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm font-[family-name:var(--font-body)]">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="bg-[var(--navy)] text-white px-6 py-2.5 rounded-lg font-[family-name:var(--font-body)] font-medium hover:bg-[var(--navy-deep)] disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Document'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-lg font-[family-name:var(--font-body)] font-medium border border-[var(--rule)] text-[var(--slate)] hover:bg-[var(--off)]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Document List */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-[var(--rule)]">
            <div className="w-14 h-14 rounded-xl bg-[var(--off)] flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[var(--navy)] mb-2">No documents yet</h3>
            <p className="text-[var(--muted)] font-[family-name:var(--font-body)] mb-6">Add your certifications, permits, and licenses to track expiry dates and get renewal reminders.</p>
            <button onClick={() => setShowForm(true)} className="bg-[var(--navy)] text-white px-6 py-3 rounded-lg font-[family-name:var(--font-body)] font-medium hover:bg-[var(--navy-deep)]">
              + Add your first document
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {['expired', 'expiring_soon', 'active'].map(statusGroup => {
              const groupDocs = documents.filter(d => d.status === statusGroup)
              if (groupDocs.length === 0) return null
              const groupLabel = statusGroup === 'active' ? 'Active Documents' :
                statusGroup === 'expiring_soon' ? 'Expiring Soon' : 'Expired / Renewal Required'
              return (
                <div key={statusGroup}>
                  <h3 className="text-sm font-semibold text-[var(--slate)] uppercase tracking-wide mb-3 font-[family-name:var(--font-mono)]">{groupLabel}</h3>
                  {groupDocs.map(doc => {
                    const instructions = DOC_TYPES.find(t => t.id === doc.doc_type)?.instructions
                    const daysUntil = doc.expiry_date ? getDaysUntil(doc.expiry_date) : null
                    return (
                      <div key={doc.id} className="bg-white rounded-xl p-5 border border-[var(--rule)] mb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-semibold text-[var(--ink)] font-[family-name:var(--font-body)]">{doc.doc_name}</span>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusBadge(doc.status)}`}>
                                {doc.status === 'active' ? 'Active' :
                                 doc.status === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)] font-[family-name:var(--font-body)]">
                              <span>{DOC_TYPES.find(t => t.id === doc.doc_type)?.label || doc.doc_type}</span>
                              {doc.issuing_body && <span>· {doc.issuing_body}</span>}
                              {doc.expiry_date && (
                                <span className={daysUntil !== null && daysUntil < 0 ? 'text-red-600 font-medium' : daysUntil !== null && daysUntil <= 30 ? 'text-amber-600 font-medium' : 'text-[var(--teal)]'}>
                                  {daysUntil !== null && daysUntil < 0
                                    ? `Expired ${Math.abs(daysUntil)}d ago`
                                    : daysUntil !== null && daysUntil <= 60
                                    ? `Expires in ${daysUntil} days`
                                    : `Exp. ${new Date(doc.expiry_date).toLocaleDateString()}`}
                                </span>
                              )}
                            </div>
                            {doc.notes && <p className="text-sm text-[var(--muted)] font-[family-name:var(--font-body)] mt-2">{doc.notes}</p>}
                          </div>
                        </div>
                        {(doc.status === 'expiring_soon' || doc.status === 'expired') && instructions && (
                          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-4">
                            <p className="text-sm font-semibold text-amber-800 mb-1 font-[family-name:var(--font-body)]">What you need to do:</p>
                            <p className="text-sm text-amber-700 font-[family-name:var(--font-body)]">{instructions}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <ChatWidget farmProfile={profile} />
    </div>
  )
}
