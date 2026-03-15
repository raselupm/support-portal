import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { sendOtpEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, recaptchaToken } = body

    // Verify reCAPTCHA if secret key is configured
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
    if (recaptchaSecret) {
      if (!recaptchaToken || typeof recaptchaToken !== 'string') {
        return NextResponse.json({ error: 'Please complete the reCAPTCHA verification.' }, { status: 400 })
      }
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${recaptchaSecret}&response=${recaptchaToken}`,
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) {
        return NextResponse.json({ error: 'reCAPTCHA verification failed. Please try again.' }, { status: 400 })
      }
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in Redis with 10-minute TTL
    await redis.set(`otp:${normalizedEmail}`, otp, { ex: 600 })

    // Upsert user record
    const existingUser = await redis.get(`user:${normalizedEmail}`)
    if (!existingUser) {
      await redis.set(`user:${normalizedEmail}`, JSON.stringify({
        email: normalizedEmail,
        createdAt: new Date().toISOString(),
      }))
    }

    // Send OTP email
    await sendOtpEmail(normalizedEmail, otp)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    )
  }
}
