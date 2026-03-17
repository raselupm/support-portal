import Link from 'next/link'
import { BookOpen, Ticket, Shield } from 'lucide-react'
import { getSession } from '@/lib/session'
import { redis } from '@/lib/redis'
import { User } from '@/lib/types'
import { isAdmin, isStaff } from '@/lib/auth'
import LogoutButton from '@/app/(portal)/logout-button'

export default async function DocsHeader({
  appName,
  wide = false,
  logoHref = '/',
}: {
  appName: string
  wide?: boolean
  logoHref?: string
}) {
  const session = await getSession()
  let displayName: string | null = null
  let admin = false
  let staff = false

  if (session.email) {
    const userRecord = await redis.get<User>(`user:${session.email}`)
    displayName = userRecord?.name?.trim() || session.email
    admin = isAdmin(session.email)
    staff = !admin && (await isStaff(session.email))
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className={`${wide ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between h-14">
          <Link href={logoHref} className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-sm">{appName}</span>
          </Link>
          <div className="flex items-center gap-4">
            {(admin || staff) && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium transition hidden sm:flex"
                style={{ color: admin ? '#9333ea' : '#2563eb' }}
              >
                <Shield className="w-4 h-4" />
                {admin ? 'Admin Panel' : 'Staff Panel'}
              </Link>
            )}
            {session.email && (
              <>
                <Link
                  href="/profile"
                  className="text-sm text-gray-500 hover:text-gray-900 transition hidden sm:block"
                >
                  {displayName}
                </Link>
                <LogoutButton />
              </>
            )}
            {!admin && !staff && (
              <Link
                href={session.email ? '/tickets' : '/login'}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                <Ticket className="w-4 h-4" />
                {session.email ? 'My Tickets' : 'Open a Ticket'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
