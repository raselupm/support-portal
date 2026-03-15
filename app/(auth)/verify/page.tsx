'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react'

export default function VerifyPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  useEffect(() => {
    const stored = sessionStorage.getItem('otp_email')
    if (!stored) {
      router.replace('/login')
      return
    }
    setEmail(stored)
    inputRefs.current[0]?.focus()
  }, [router])

  function handleInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    setError('')

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (digit && index === 5) {
      const fullCode = [...newCode].join('')
      if (fullCode.length === 6) {
        submitCode(fullCode)
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      submitCode(pasted)
    }
  }

  async function submitCode(fullCode: string) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid code. Please try again.')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      sessionStorage.removeItem('otp_email')
      router.push('/tickets')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to resend code.')
        return
      }

      setSuccessMsg('A new code has been sent to your email.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits.')
      return
    }
    submitCode(fullCode)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="mt-2 text-gray-500 text-sm">Enter your verification code</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Check your inbox</h2>
          {email && (
            <p className="text-sm text-gray-500 mb-6">
              We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.
              The code expires in 10 minutes.
            </p>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Verification code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInput(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                    className="w-11 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and sign in'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between text-sm">
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleResend}
              disabled={resending}
              className="text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium transition"
            >
              {resending ? 'Resending...' : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
