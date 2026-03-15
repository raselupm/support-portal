import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Chat } from '@/lib/types'
import { Ticket } from 'lucide-react'
import LogoutButton from '@/app/(portal)/logout-button'
import AdminNavLinks from './admin-nav-links'
import OnlineUsers from './online-users'
import ChatNotifier from './chat-notifier'
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
  const waitingCount = await getWaitingCount()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  return (
    <>
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-900">{appName}</span>
          </div>
          {admin ? (
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Admin Panel
            </span>
          ) : (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Staff Panel
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">
          <AdminNavLinks isAdmin={admin} initialWaitingCount={waitingCount} />
          <div className="mt-auto">
            <OnlineUsers currentEmail={session.email} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{session.email}</span>
            <LogoutButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    <ChatNotifier />
    <NavigationProgress />
    </>
  )
}
