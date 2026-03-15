import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff, isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Chat } from '@/lib/types'
import { MessageSquare } from 'lucide-react'
import ChatListClient from './chat-list-client'
import CopyButton from './copy-button'

type ChatWithCount = Chat & { messageCount: number }

async function getChats(): Promise<ChatWithCount[]> {
  const chatIds = (await redis.zrange('chats', 0, -1, { rev: true })) as string[]
  if (chatIds.length === 0) return []

  const chats: ChatWithCount[] = []
  for (const id of chatIds) {
    const chatData = await redis.get<Chat>(`chat:${id}`)
    if (chatData) {
      const messageCount = await redis.llen(`chat_messages:${id}`)
      chats.push({ ...chatData, messageCount })
    }
  }
  return chats
}

export default async function ChatsPage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (!(await isStaff(session.email))) redirect('/tickets')

  const admin = isAdmin(session.email)
  const chats = await getChats()
  const waitingCount = chats.filter((c) => c.status === 'waiting').length

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  const snippet = `<script src="${appUrl}/chat-widget.js" data-portal-url="${appUrl}"></script>`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">
          Chats
          {waitingCount > 0 && (
            <span className="ml-2 text-sm font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {waitingCount} waiting
            </span>
          )}
        </h1>
      </div>

      {/* Install Script Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Install Chat Widget</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Add this snippet to any website to embed the chat widget.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <pre className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {snippet}
          </pre>
          <CopyButton text={snippet} />
        </div>
      </div>

      {/* Chat List */}
      <ChatListClient initialChats={chats} isAdmin={admin} />
    </div>
  )
}
