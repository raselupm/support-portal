import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { User } from '@/lib/types'
import { Ticket, Shield } from 'lucide-react'
import LogoutButton from './logout-button'
import Link from 'next/link'
import TicketNotifier from '@/app/(admin)/ticket-notifier'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session.email) {
    redirect('/login')
  }

  const admin = isAdmin(session.email)
  const staff = !admin && (await isStaff(session.email))
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  const [userRecord, staffRecord] = await Promise.all([
    redis.get<User>(`user:${session.email}`),
    redis.get<{ name?: string }>(`staff:${session.email}`),
  ])
  const displayName = userRecord?.name?.trim() || staffRecord?.name?.trim() || session.email

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <a href="/tickets" className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition">
              <Ticket className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-sm">{appName}</span>
            </a>
            <div className="flex items-center gap-4">
              {admin && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium transition"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin Panel</span>
                </Link>
              )}
              {staff && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Staff Panel</span>
                </Link>
              )}
              <Link
                href="/profile"
                className="text-sm text-gray-500 hover:text-gray-900 transition hidden sm:block"
              >
                {displayName}
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
    {(admin || staff) && <TicketNotifier />}
    </>
  )
}
