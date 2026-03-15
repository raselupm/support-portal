import { NextRequest, NextResponse } from 'next/server'
import { unsealData } from 'iron-session'
import { SessionData } from './lib/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const cookieValue = request.cookies.get('support_portal_session')?.value

    if (!cookieValue) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const session = await unsealData<SessionData>(cookieValue, {
        password: process.env.SESSION_SECRET!,
      })

      if (!session.email) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      // Staff/admin check is enforced in the layout server component (requires Redis)
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname.startsWith('/tickets') || pathname === '/') {
    const cookieValue = request.cookies.get('support_portal_session')?.value

    if (!cookieValue) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const session = await unsealData<SessionData>(cookieValue, {
        password: process.env.SESSION_SECRET!,
      })

      if (!session.email) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/tickets/:path*', '/', '/admin/:path*'],
}
