'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

interface Props {
  initialName: string
  initialReceiveEmailNotifications: boolean
  initialReceiveNewTicketEmails: boolean
  isPrivileged: boolean
}

export default function ProfileForm({
  initialName,
  initialReceiveEmailNotifications,
  initialReceiveNewTicketEmails,
  isPrivileged,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [receiveEmailNotifications, setReceiveEmailNotifications] = useState(initialReceiveEmailNotifications)
  const [receiveNewTicketEmails, setReceiveNewTicketEmails] = useState(initialReceiveNewTicketEmails)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  function handleNotificationToggle() {
    if (receiveEmailNotifications) {
      // Trying to uncheck — show warning first
      setShowWarning(true)
    } else {
      setReceiveEmailNotifications(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter your name.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          receiveEmailNotifications,
          receiveNewTicketEmails,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Notification preference */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Email notifications</p>

          {!isPrivileged && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={receiveEmailNotifications}
                  onChange={handleNotificationToggle}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 rounded-full bg-gray-200 peer-checked:bg-blue-600 transition-colors peer-disabled:opacity-50" />
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-has-[:disabled]:opacity-50">
                  Receive email when new replies are received on a ticket
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {receiveEmailNotifications
                    ? "You'll be notified by email when someone replies to your tickets."
                    : "You won't receive email notifications. Check the portal manually for updates."}
                </p>
              </div>
            </label>
          )}

          {isPrivileged && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={receiveNewTicketEmails}
                  onChange={(e) => setReceiveNewTicketEmails(e.target.checked)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 rounded-full bg-gray-200 peer-checked:bg-blue-600 transition-colors peer-disabled:opacity-50" />
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 group-has-[:disabled]:opacity-50">
                  Receive email when a new ticket is submitted
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {receiveNewTicketEmails
                    ? "You'll be notified by email whenever a customer submits a new ticket."
                    : "New ticket email notifications are disabled."}
                </p>
              </div>
            </label>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
            Profile updated successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-6 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {/* Warning popup when disabling email notifications */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Disable email notifications?</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  You will <strong>not</strong> receive email alerts when someone replies to your tickets.
                  You'll need to visit the support portal manually to check for new replies.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Keep enabled
              </button>
              <button
                onClick={() => {
                  setReceiveEmailNotifications(false)
                  setShowWarning(false)
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition"
              >
                Disable anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
