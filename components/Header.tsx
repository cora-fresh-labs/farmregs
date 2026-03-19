'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function Header() {
  const { user, loading } = useUser()
  const pathname = usePathname()

  const isActive = (path: string) =>
    pathname.startsWith(path) ? 'text-white font-medium' : 'text-green-200 hover:text-white'

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="bg-[#1b4332] text-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-lg">FarmRegs</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
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
                className="text-green-200 hover:text-white ml-2"
              >
                Sign Out
              </button>
            ) : (
              <Link href="/" className="text-green-200 hover:text-white ml-2">
                Sign In
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
