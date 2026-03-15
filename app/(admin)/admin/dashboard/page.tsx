import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket, StaffMember } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { TicketIcon, MessageSquare, CheckCircle, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import WeeklyChart from './weekly-chart'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
}

function StatCard({ label, value, icon, colorClass }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (!(await isStaff(session.email))) redirect('/tickets')

  // 1. Ticket counts by status
  const allTicketIds = (await redis.zrange('tickets', 0, -1)) as string[]
  const counts = { total: 0, open: 0, customer_reply: 0, replied: 0 }
  const allTickets: Ticket[] = []

  for (const id of allTicketIds) {
    const ticket = await redis.get<Ticket>(`ticket:${id}`)
    if (ticket) {
      allTickets.push(ticket)
      counts.total++
      if (ticket.status === 'open') counts.open++
      else if (ticket.status === 'customer_reply') counts.customer_reply++
      else if (ticket.status === 'replied') counts.replied++
    }
  }

  // 2. Weekly new tickets (last 7 days)
  const weeklyData: { day: string; date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dayEnd = dayStart + 86400000 - 1
    const count = await redis.zcount('tickets', dayStart, dayEnd)
    weeklyData.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toISOString().split('T')[0],
      count: count as number,
    })
  }

  // 3. Staff performance this week
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMon)

  const staffIds = (await redis.zrange('staff_list', 0, -1)) as string[]
  const staffPerf = await Promise.all(
    staffIds.map(async (email) => {
      const staffData = await redis.get<StaffMember>(`staff:${email}`)
      let repliesThisWeek = 0
      const tempDate = new Date(monday)
      while (tempDate <= now) {
        const dateStr = tempDate.toISOString().split('T')[0]
        const count = await redis.get(`staff_replies:${email}:${dateStr}`)
        repliesThisWeek += count ? Number(count) : 0
        tempDate.setDate(tempDate.getDate() + 1)
      }
      return {
        email,
        name: staffData?.name || email,
        repliesThisWeek,
      }
    })
  )

  // 4. Recent 5 tickets
  const recentIds = (await redis.zrange('tickets', 0, 4, { rev: true })) as string[]
  const recentTickets: Ticket[] = []
  for (const id of recentIds) {
    const ticket = await redis.get<Ticket>(`ticket:${id}`)
    if (ticket) recentTickets.push(ticket)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tickets"
          value={counts.total}
          icon={<TicketIcon className="w-5 h-5 text-gray-600" />}
          colorClass="bg-gray-100"
        />
        <StatCard
          label="Open"
          value={counts.open}
          icon={<TicketIcon className="w-5 h-5 text-blue-600" />}
          colorClass="bg-blue-50"
        />
        <StatCard
          label="Customer Reply"
          value={counts.customer_reply}
          icon={<MessageSquare className="w-5 h-5 text-amber-600" />}
          colorClass="bg-amber-50"
        />
        <StatCard
          label="Replied"
          value={counts.replied}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          colorClass="bg-green-50"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Tickets — Last 7 Days</h2>
          <WeeklyChart data={weeklyData} />
        </div>

        {/* Recent tickets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Tickets</h2>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tickets yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 block"
                    >
                      {ticket.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{ticket.product}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff performance table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Staff Performance This Week</h2>
        {staffPerf.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No staff members yet.{' '}
            <Link href="/admin/staff" className="text-blue-600 hover:underline">
              Add staff
            </Link>
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">
                  Name
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">
                  Email
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">
                  Replies This Week
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staffPerf
                .sort((a, b) => b.repliesThisWeek - a.repliesThisWeek)
                .map((member) => (
                  <tr key={member.email}>
                    <td className="py-3 text-sm font-medium text-gray-900">{member.name}</td>
                    <td className="py-3 text-sm text-gray-500">{member.email}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700">
                        {member.repliesThisWeek}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
