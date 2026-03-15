import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { StaffMember } from '@/lib/types'
import { Users } from 'lucide-react'
import StaffClient from './staff-client'

async function getStaffList(): Promise<StaffMember[]> {
  const emails = (await redis.zrange('staff_list', 0, -1)) as string[]
  const staffList: StaffMember[] = []
  for (const email of emails) {
    const member = await redis.get<StaffMember>(`staff:${email}`)
    if (member) staffList.push(member)
  }
  return staffList
}

export default async function StaffPage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (!isAdmin(session.email)) redirect('/admin/dashboard')

  const staffList = await getStaffList()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Staff Management</h1>
      </div>
      <StaffClient initialStaff={staffList} />
    </div>
  )
}
