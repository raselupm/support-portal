import { NextRequest, NextResponse, after } from 'next/server'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { pusherServer, chatChannel, EVT_NEW_MESSAGE } from '@/lib/pusher'
import { Chat, ChatMessage } from '@/lib/types'

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
  const { id } = await params
  const body = await request.json()
  const { token, event } = body

  if (!token || !event) {
    return NextResponse.json({ error: 'Missing token or event.' }, { status: 400, headers: corsHeaders })
  }

  const storedChatId = await redis.get(`chat_token:${token}`)
  if (storedChatId !== id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
  }

  const chat = await redis.get<Chat>(`chat:${id}`)
  if (!chat || chat.status !== 'active') {
    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  }

  const visitorName = chat.visitorName
  const content = event === 'minimize'
    ? `${visitorName} minimized the chat.`
    : `${visitorName} opened the chat.`

  const now = new Date().toISOString()
  const systemMessage: ChatMessage = {
    id: nanoid(10),
    chatId: id,
    sender: 'system',
    senderEmail: '',
    senderName: 'System',
    content,
    createdAt: now,
    staffOnly: true,
  }
  await redis.rpush(`chat_messages:${id}`, JSON.stringify(systemMessage))

  after(pusherServer.trigger(chatChannel(id), EVT_NEW_MESSAGE, systemMessage))

  return NextResponse.json({ ok: true }, { headers: corsHeaders })
}
