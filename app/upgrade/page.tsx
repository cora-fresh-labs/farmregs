'use client'

import Link from 'next/link'
import Header from '@/components/Header'

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[var(--white)]">
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="mb-8">
          <div className="w-12 h-12 rounded-full bg-[var(--off)] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-[var(--navy)] mb-3">
            FarmRegs Pro
          </h1>
          <p className="text-[var(--slate)] font-[family-name:var(--font-body)] text-lg">
            Let Fairchild draft compliance documents, generate action plans, and pre-fill applications for your farm.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--rule)] p-8 mb-8">
          <div className="font-[family-name:var(--font-heading)] text-4xl font-bold text-[var(--navy)] mb-1">$49</div>
          <div className="text-[var(--muted)] font-[family-name:var(--font-mono)] text-sm mb-8">/month</div>

          <div className="text-left space-y-4 mb-8">
            {[
              'Fairchild drafts food safety plans, checklists, and renewal applications',
              'Pre-filled permit applications based on your state and farm type',
              'Export-ready compliance documents',
              'Priority regulatory change notifications',
              'Everything in the free tier',
            ].map(feature => (
              <div key={feature} className="flex items-start gap-3">
                <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm text-[var(--ink)] font-[family-name:var(--font-body)]">{feature}</span>
              </div>
            ))}
          </div>

          <button
            disabled
            className="w-full bg-[var(--navy)] text-white py-3.5 rounded-lg font-[family-name:var(--font-body)] font-medium text-sm opacity-60 cursor-not-allowed"
          >
            Coming Soon
          </button>
          <p className="text-xs text-[var(--muted)] font-[family-name:var(--font-body)] mt-3">
            We're finalizing Pro. Join the waitlist to get early access.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-[var(--ocean)] hover:underline font-[family-name:var(--font-body)]"
        >
          Back to dashboard
        </Link>
      </main>
    </div>
  )
}
