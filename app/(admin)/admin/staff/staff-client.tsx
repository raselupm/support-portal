'use client'

import { useState } from 'react'
import { StaffMember } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, UserPlus, Loader2 } from 'lucide-react'

interface StaffClientProps {
  initialStaff: StaffMember[]
}

export default function StaffClient({ initialStaff }: StaffClientProps) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add staff member.')
        return
      }
      setStaff((prev) => [...prev, data.staff])
      setName('')
      setEmail('')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(memberEmail: string) {
    setRemovingEmail(memberEmail)
    try {
      const encodedEmail = encodeURIComponent(memberEmail)
      const res = await fetch(`/api/admin/staff/${encodedEmail}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to remove staff member.')
        return
      }
      setStaff((prev) => prev.filter((m) => m.email !== memberEmail))
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setRemovingEmail(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Staff table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Staff Members{' '}
            <span className="ml-1 text-xs font-normal text-gray-400">({staff.length})</span>
          </h2>
        </div>
        {staff.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No staff members yet. Add one below.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">
                  Email
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden md:table-cell">
                  Created
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((member) => (
                <tr key={member.email} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500 sm:hidden">{member.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-sm text-gray-500">{member.email}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleRemove(member.email)}
                      disabled={removingEmail === member.email}
                      className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors font-medium"
                    >
                      {removingEmail === member.email ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add staff form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Staff Member
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="staff-name" className="block text-xs font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="staff-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={adding}
              />
            </div>
            <div>
              <label htmlFor="staff-email" className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={adding}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Add Staff Member
          </button>
        </form>
      </div>
    </div>
  )
}
