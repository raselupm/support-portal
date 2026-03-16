import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { Chat, ChatMessage } from '@/lib/types'
import { pusherServer, chatChannel, CHATS_CHANNEL, EVT_NEW_MESSAGE, EVT_STATUS_CHANGE, EVT_CHAT_UPDATED } from '@/lib/pusher'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    // Verify token belongs to this chat
    const storedChatId = await redis.get(`chat_token:${token}`)
    if (storedChatId !== id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    const chat = await redis.get<Chat>(`chat:${id}`)
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404, headers: corsHeaders })
    }

    if (chat.status === 'closed') {
      return NextResponse.json({ chat }, { headers: corsHeaders })
    }

    const now = new Date().toISOString()
    const updatedChat: Chat = { ...chat, status: 'closed', updatedAt: now }
    await redis.set(`chat:${id}`, JSON.stringify(updatedChat))

    const visitorName = chat.visitorName || chat.visitorEmail
    const systemMessage: ChatMessage = {
      id: nanoid(10),
      chatId: id,
      sender: 'system',
      senderEmail: '',
      senderName: 'System',
      content: `Chat ended by: ${visitorName}`,
      createdAt: now,
    }
    await redis.rpush(`chat_messages:${id}`, JSON.stringify(systemMessage))

    waitUntil(Promise.all([
      pusherServer.trigger(chatChannel(id), EVT_NEW_MESSAGE, systemMessage),
      pusherServer.trigger(chatChannel(id), EVT_STATUS_CHANGE, { status: 'closed' }),
      pusherServer.trigger(CHATS_CHANNEL, EVT_CHAT_UPDATED, updatedChat),
    ]))

    return NextResponse.json({ chat: updatedChat }, { headers: corsHeaders })
  } catch (err) {
    console.error('POST /api/chat/[id]/visitor-close error:', err)
    return NextResponse.json({ error: 'Failed to close chat.' }, { status: 500, headers: corsHeaders })
  }
}
