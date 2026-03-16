import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { User } from '@/lib/types'
import { UserCircle } from 'lucide-react'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session.email) redirect('/login')

  const admin = isAdmin(session.email)
  const staff = !admin && (await isStaff(session.email))
  const privileged = admin || staff

  const [userRecord, staffRecord] = await Promise.all([
    redis.get<User>(`user:${session.email}`),
    redis.get<{ name?: string }>(`staff:${session.email}`),
  ])

  const currentName = userRecord?.name?.trim() || staffRecord?.name?.trim() || ''

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <UserCircle className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-5 pb-5 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Email address</p>
          <p className="text-sm text-gray-700">{session.email}</p>
        </div>

        <ProfileForm
          initialName={currentName}
          initialReceiveEmailNotifications={userRecord?.receiveEmailNotifications ?? true}
          initialReceiveNewTicketEmails={userRecord?.receiveNewTicketEmails ?? true}
          isPrivileged={privileged}
        />
      </div>
    </div>
  )
}
