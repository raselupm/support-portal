import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Chat, ChatMessage } from '@/lib/types'
import { pusherServer, chatChannel, CHATS_CHANNEL, EVT_NEW_MESSAGE, EVT_STATUS_CHANGE, EVT_CHAT_UPDATED } from '@/lib/pusher'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session.email) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    if (!(await isStaff(session.email))) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const chat = await redis.get<Chat>(`chat:${id}`)
    if (!chat) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })

    const staffEmail = session.email.trim().toLowerCase()
    const staffRecord = await redis.get<{ name: string }>(`staff:${staffEmail}`)
    const staffName = staffRecord?.name || 'Support Staff'
    const now = new Date().toISOString()

    const updatedChat: Chat = { ...chat, status: 'closed', updatedAt: now }
    await redis.set(`chat:${id}`, JSON.stringify(updatedChat))

    const systemMessage: ChatMessage = {
      id: nanoid(10),
      chatId: id,
      sender: 'system',
      senderEmail: '',
      senderName: 'System',
      content: `Chat ended by: ${staffName}`,
      createdAt: now,
    }
    await redis.rpush(`chat_messages:${id}`, JSON.stringify(systemMessage))

    await pusherServer.trigger(chatChannel(id), EVT_NEW_MESSAGE, systemMessage)
    await pusherServer.trigger(chatChannel(id), EVT_STATUS_CHANGE, { status: 'closed' })
    await pusherServer.trigger(CHATS_CHANNEL, EVT_CHAT_UPDATED, updatedChat)

    return NextResponse.json({ chat: updatedChat })
  } catch (err) {
    console.error('POST /api/chat/[id]/close error:', err)
    return NextResponse.json({ error: 'Failed to close chat.' }, { status: 500 })
  }
}
