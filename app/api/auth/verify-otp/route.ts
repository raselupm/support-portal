import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedCode = code.trim()

    // Get stored OTP from Redis
    const storedOtp = await redis.get<string>(`otp:${normalizedEmail}`)

    if (storedOtp === null || storedOtp === undefined) {
      return NextResponse.json(
        { error: 'Verification code has expired or does not exist. Please request a new one.' },
        { status: 400 }
      )
    }

    if (storedOtp.toString() !== normalizedCode) {
      return NextResponse.json(
        { error: 'Incorrect verification code. Please try again.' },
        { status: 400 }
      )
    }

    // Code is valid — delete it from Redis
    await redis.del(`otp:${normalizedEmail}`)

    // Create session
    const session = await getSession()
    session.email = normalizedEmail
    await session.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
