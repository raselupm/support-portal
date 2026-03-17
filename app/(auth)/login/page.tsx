'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'
import Script from 'next/script'

declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement, options: { sitekey: string; theme?: string }) => number
      getResponse: (widgetId?: number) => string
      reset: (widgetId?: number) => void
    }
    onRecaptchaLoad: () => void
  }
}

function GoogleErrorReader({ onError }: { onError: (msg: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const googleError = searchParams.get('error')
    if (googleError) {
      const messages: Record<string, string> = {
        google_cancelled: 'Google sign-in was cancelled.',
        google_token_failed: 'Failed to complete Google sign-in. Please try again.',
        google_userinfo_failed: 'Could not retrieve your Google account info. Please try again.',
        google_no_email: 'Your Google account does not have an email address.',
        google_not_configured: 'Google login is not configured.',
      }
      onError(messages[googleError] || 'Google sign-in failed. Please try again.')
    }
  }, [searchParams, onError])

  return null
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recaptchaRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  useEffect(() => {
    if (!siteKey) return

    const renderWidget = () => {
      if (recaptchaRef.current && widgetIdRef.current === null && typeof window.grecaptcha !== 'undefined') {
        widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, { sitekey: siteKey })
      }
    }

    if (typeof window.grecaptcha !== 'undefined') {
      renderWidget()
    } else {
      window.onRecaptchaLoad = renderWidget
      if (!document.querySelector('script[data-recaptcha]')) {
        const script = document.createElement('script')
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit'
        script.async = true
        script.defer = true
        script.dataset.recaptcha = 'true'
        document.head.appendChild(script)
      }
    }
  }, [siteKey])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    const recaptchaToken = siteKey
      ? window.grecaptcha?.getResponse(widgetIdRef.current ?? undefined)
      : undefined

    if (siteKey && !recaptchaToken) {
      setError('Please complete the reCAPTCHA verification.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, recaptchaToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send verification code. Please try again.')
        window.grecaptcha?.reset(widgetIdRef.current ?? undefined)
        return
      }

      sessionStorage.setItem('otp_email', trimmedEmail)
      router.push('/verify')
    } catch {
      setError('Network error. Please check your connection and try again.')
      window.grecaptcha?.reset(widgetIdRef.current ?? undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense>
        <GoogleErrorReader onError={setError} />
      </Suspense>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="mt-2 text-gray-500 text-sm">Sign in to access your support tickets</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email address and we&apos;ll send you a one-time login code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={loading}
              />
            </div>

            {siteKey && (
              <div className="flex justify-center">
                <div ref={recaptchaRef} />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  Send login code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {googleClientId && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <a
                href="/api/auth/google"
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg border border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.576c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.163 6.656 3.576 9 3.576z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </a>
            </>
          )}
        </div>
      </div>
      <Script
        src={`${process.env.NEXT_PUBLIC_APP_URL}/chat-widget.js`}
        data-portal-url={process.env.NEXT_PUBLIC_APP_URL}
        strategy="lazyOnload"
      />
    </div>
  )
}
