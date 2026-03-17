import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket, StaffMember, Chat, DocArticle, DocCategory } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { TicketIcon, MessageSquare, CheckCircle, LayoutDashboard, MessagesSquare, Clock, ActivitySquare, XCircle, BookOpen, FolderOpen } from 'lucide-react'
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
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
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

  // 5. Chat counts by status
  const allChatIds = (await redis.zrange('chats', 0, -1)) as string[]
  const chatCounts = { total: 0, waiting: 0, active: 0, closed: 0 }
  const recentChats: Chat[] = []

  for (const id of allChatIds) {
    const chat = await redis.get<Chat>(`chat:${id}`)
    if (chat) {
      chatCounts.total++
      if (chat.status === 'waiting') chatCounts.waiting++
      else if (chat.status === 'active') chatCounts.active++
      else if (chat.status === 'closed') chatCounts.closed++
    }
  }

  // Recent 5 chats (newest first)
  const recentChatIds = (await redis.zrange('chats', 0, 4, { rev: true })) as string[]
  for (const id of recentChatIds) {
    const chat = await redis.get<Chat>(`chat:${id}`)
    if (chat) recentChats.push(chat)
  }

  // 6. Docs counts + recent 5 articles
  const [allArticleIds, allCategoryIds] = await Promise.all([
    redis.zrange('doc_articles', 0, -1) as Promise<string[]>,
    redis.zrange('doc_categories', 0, -1) as Promise<string[]>,
  ])
  const docCounts = { articles: allArticleIds.length, categories: allCategoryIds.length }

  const recentArticleIds = (await redis.zrange('doc_articles', 0, 4, { rev: true })) as string[]
  const recentArticles = (
    await Promise.all(recentArticleIds.map((id) => redis.get<DocArticle>(`doc_article:${id}`)))
  ).filter(Boolean) as DocArticle[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Ticket stat cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tickets</p>
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
      </div>

      {/* Chat stat cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Live Chats</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Chats"
            value={chatCounts.total}
            icon={<MessagesSquare className="w-5 h-5 text-gray-600" />}
            colorClass="bg-gray-100"
          />
          <StatCard
            label="Waiting"
            value={chatCounts.waiting}
            icon={<Clock className="w-5 h-5 text-orange-600" />}
            colorClass="bg-orange-50"
          />
          <StatCard
            label="Active"
            value={chatCounts.active}
            icon={<ActivitySquare className="w-5 h-5 text-green-600" />}
            colorClass="bg-green-50"
          />
          <StatCard
            label="Closed"
            value={chatCounts.closed}
            icon={<XCircle className="w-5 h-5 text-gray-400" />}
            colorClass="bg-gray-50"
          />
        </div>
      </div>

      {/* Docs stat cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Documentation</p>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
              label="Articles"
              value={docCounts.articles}
              icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
              colorClass="bg-indigo-50"
          />
          <StatCard
              label="Categories"
              value={docCounts.categories}
              icon={<FolderOpen className="w-5 h-5 text-violet-600" />}
              colorClass="bg-violet-50"
          />
        </div>
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

      {/* Recent chats · Recent articles · Staff performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent chats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Chats</h2>
            <Link href="/admin/chats" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {recentChats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No chats yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentChats.map((chat) => (
                <div key={chat.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/chats/${chat.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors block truncate"
                    >
                      {chat.visitorName || chat.visitorEmail}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 truncate">{chat.visitorEmail}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    chat.status === 'waiting'
                      ? 'bg-orange-100 text-orange-700'
                      : chat.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {chat.status === 'waiting' ? 'Waiting' : chat.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent articles */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Articles</h2>
            <Link href="/admin/docs" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {recentArticles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No articles yet.{' '}
              <Link href="/admin/docs/new" className="text-blue-600 hover:underline">Create one</Link>
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentArticles.map((article) => (
                <div key={article.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/docs/${article.id}/edit`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors block truncate"
                    >
                      {article.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{article.categoryName}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/docs/${article.id}`}
                    target="_blank"
                    className="shrink-0 text-xs text-gray-400 hover:text-blue-600 transition"
                  >
                    View ↗
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Staff Performance This Week</h2>
          {staffPerf.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No staff members yet.{' '}
              <Link href="/admin/staff" className="text-blue-600 hover:underline">Add staff</Link>
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {staffPerf
                .sort((a, b) => b.repliesThisWeek - a.repliesThisWeek)
                .map((member) => (
                  <div key={member.email} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700">
                      {member.repliesThisWeek}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
