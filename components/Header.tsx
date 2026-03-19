'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function Header() {
  const { user, loading } = useUser()
  const pathname = usePathname()

  const isActive = (path: string) =>
    pathname.startsWith(path) ? 'text-white font-medium' : 'text-white/60 hover:text-white'

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="bg-[var(--navy)] text-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="font-[family-name:var(--font-heading)] font-bold text-lg">FarmRegs</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ocean)]" />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-[family-name:var(--font-body)]">
          <Link href="/regulations" className={isActive('/regulations')}>Regulations</Link>
          {user && (
            <>
              <Link href="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
              <Link href="/documents" className={isActive('/documents')}>Documents</Link>
            </>
          )}
          {!loading && (
            user ? (
              <button
                onClick={handleSignOut}
                className="text-white/60 hover:text-white ml-2"
              >
                Sign Out
              </button>
            ) : (
              <Link href="/" className="text-white/60 hover:text-white ml-2">
                Sign In
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
