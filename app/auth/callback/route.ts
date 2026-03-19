import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user has a farm profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('farm_profiles')
          .select('id')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle()

        if (!profile) {
          // New Google user — needs profile setup
          return NextResponse.redirect(new URL('/?setup=true', request.url))
        }

        // Auto-link user_id if profile exists but not yet linked
        if (profile) {
          await supabase
            .from('farm_profiles')
            .update({ user_id: user.id })
            .eq('id', profile.id)
            .is('user_id', null)
        }
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If code exchange fails, redirect to home
  return NextResponse.redirect(new URL('/', request.url))
}
