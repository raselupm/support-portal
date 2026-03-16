import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Chat, Ticket as TicketType, User } from '@/lib/types'
import AdminShell from './admin-shell'
import ChatNotifier from './chat-notifier'
import TicketNotifier from './ticket-notifier'
import NavigationProgress from './navigation-progress'

async function getWaitingCount(): Promise<number> {
  try {
    const chatIds = (await redis.zrange('chats', 0, -1)) as string[]
    let count = 0
    for (const id of chatIds) {
      const chat = await redis.get<Chat>(`chat:${id}`)
      if (chat?.status === 'waiting') count++
    }
    return count
  } catch {
    return 0
  }
}

async function getOpenTicketCount(): Promise<number> {
  try {
    const ticketIds = (await redis.zrange('tickets', 0, -1)) as string[]
    let count = 0
    for (const id of ticketIds) {
      const ticket = await redis.get<TicketType>(`ticket:${id}`)
      if (ticket?.status === 'open') count++
    }
    return count
  } catch {
    return 0
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session.email) {
    redirect('/login')
  }

  if (!(await isStaff(session.email))) {
    redirect('/tickets')
  }

  const admin = isAdmin(session.email)
  const [waitingCount, openTicketCount, userRecord, staffRecord] = await Promise.all([
    getWaitingCount(),
    getOpenTicketCount(),
    redis.get<User>(`user:${session.email}`),
    redis.get<{ name?: string }>(`staff:${session.email}`),
  ])
  const displayName = userRecord?.name?.trim() || staffRecord?.name?.trim() || session.email
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  return (
    <>
      <AdminShell
        isAdmin={admin}
        admin={admin}
        displayName={displayName}
        appName={appName}
        waitingCount={waitingCount}
        openTicketCount={openTicketCount}
        currentEmail={session.email}
      >
        {children}
      </AdminShell>
      <ChatNotifier />
      <TicketNotifier />
      <NavigationProgress />
    </>
  )
}
