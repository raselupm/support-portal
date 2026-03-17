import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`)
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  if (errorParam || !code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=google_token_failed`)
  }

  const tokens = await tokenRes.json()

  // Get user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userRes.ok) {
    return NextResponse.redirect(`${appUrl}/login?error=google_userinfo_failed`)
  }

  const userInfo = await userRes.json()
  const email: string | undefined = userInfo.email

  if (!email) {
    return NextResponse.redirect(`${appUrl}/login?error=google_no_email`)
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Ensure user record exists in Redis
  const { redis } = await import('@/lib/redis')
  const existingUser = await redis.get(`user:${normalizedEmail}`)
  if (!existingUser) {
    await redis.set(
      `user:${normalizedEmail}`,
      JSON.stringify({ email: normalizedEmail, createdAt: new Date().toISOString() })
    )
  }

  // Create session
  const session = await getSession()
  session.email = normalizedEmail
  await session.save()

  return NextResponse.redirect(`${appUrl}/`)
}
