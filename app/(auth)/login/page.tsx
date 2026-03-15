'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recaptchaRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

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
