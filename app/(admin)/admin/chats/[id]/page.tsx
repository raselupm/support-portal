import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Chat, ChatMessage, ChatMeta, StaffMember } from '@/lib/types'
import StaffChatWindow from './staff-chat-window'

interface Props {
  params: Promise<{ id: string }>
}

async function getChat(id: string): Promise<Chat | null> {
  return redis.get<Chat>(`chat:${id}`)
}

async function getMessages(chatId: string): Promise<ChatMessage[]> {
  const raw = (await redis.lrange(`chat_messages:${chatId}`, 0, -1)) as string[]
  return raw
    .map((r) => {
      try {
        return typeof r === 'string' ? JSON.parse(r) : r
      } catch {
        return null
      }
    })
    .filter(Boolean) as ChatMessage[]
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session.email) redirect('/login')

  const staffCheck = await isStaff(session.email)
  if (!staffCheck) redirect('/tickets')

  const chat = await getChat(id)
  if (!chat) notFound()

  const [messages, meta, staffRecord] = await Promise.all([
    getMessages(id),
    redis.get<ChatMeta>(`chat_meta:${id}`),
    redis.get<StaffMember>(`staff:${session.email.trim().toLowerCase()}`),
  ])

  const staffName = staffRecord?.name || session.email

  return (
    <StaffChatWindow
      initialChat={chat}
      initialMessages={messages}
      staffEmail={session.email}
      staffName={staffName}
      meta={meta ?? undefined}
    />
  )
}
