import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'
import { Chat, ChatMessage } from '@/lib/types'
import { pusherServer, chatChannel, EVT_NEW_MESSAGE } from '@/lib/pusher'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

async function verifyToken(token: string, chatId: string): Promise<boolean> {
  const storedChatId = await redis.get(`chat_token:${token}`)
  return storedChatId === chatId
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const after = parseInt(searchParams.get('after') || '0', 10)

    let authorized = false
    if (token) {
      authorized = await verifyToken(token, id)
    } else {
      const session = await getSession()
      if (session.email) {
        authorized = await isStaff(session.email)
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    const chat = await redis.get<Chat>(`chat:${id}`)
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404, headers: corsHeaders })
    }

    const allRaw = (await redis.lrange(`chat_messages:${id}`, 0, -1)) as string[]
    const total = allRaw.length
    const rawMessages = after > 0
      ? (await redis.lrange(`chat_messages:${id}`, after, -1)) as string[]
      : allRaw

    const messages: ChatMessage[] = rawMessages
      .map((raw) => { try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null } })
      .filter(Boolean) as ChatMessage[]

    return NextResponse.json({ messages, status: chat.status, total }, { headers: corsHeaders })
  } catch (err) {
    console.error('GET /api/chat/[id]/messages error:', err)
    return NextResponse.json({ error: 'Failed to fetch messages.' }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, token } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400, headers: corsHeaders })
    }

    const chat = await redis.get<Chat>(`chat:${id}`)
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404, headers: corsHeaders })
    }

    let sender: 'visitor' | 'staff' = 'visitor'
    let senderEmail = ''
    let senderName = ''

    if (token) {
      const valid = await verifyToken(token, id)
      if (!valid) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
      }
      sender = 'visitor'
      senderEmail = chat.visitorEmail
      senderName = chat.visitorEmail

      // Rate limit: max visitor messages per second
      const msgLimit = parseInt(process.env.MAX_CHAT_MESSAGES_PER_SECOND || '3', 10)
      const second = Math.floor(Date.now() / 1000)
      const rateKey = `rate:chat_msg:${id}:${second}`
      const msgCount = await redis.incr(rateKey)
      await redis.expire(rateKey, 2)
      if (msgCount > msgLimit) {
        return NextResponse.json(
          { error: 'You are sending messages too quickly. Please slow down.' },
          { status: 429, headers: corsHeaders }
        )
      }
    } else {
      const session = await getSession()
      if (!session.email) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
      }
      const staffCheck = await isStaff(session.email)
      if (!staffCheck) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
      }
      sender = 'staff'
      senderEmail = session.email
      const staffRecord = await redis.get<{ name: string }>(`staff:${session.email.trim().toLowerCase()}`)
      senderName = staffRecord?.name || 'Support Staff'
    }

    const messageId = nanoid(10)
    const now = new Date().toISOString()
    const message: ChatMessage = {
      id: messageId, chatId: id, sender, senderEmail, senderName,
      content: content.trim(), createdAt: now,
    }

    await redis.rpush(`chat_messages:${id}`, JSON.stringify(message))
    await redis.set(`chat:${id}`, JSON.stringify({ ...chat, updatedAt: now }))

    waitUntil(pusherServer.trigger(chatChannel(id), EVT_NEW_MESSAGE, message))

    return NextResponse.json({ message }, { headers: corsHeaders })
  } catch (err) {
    console.error('POST /api/chat/[id]/messages error:', err)
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500, headers: corsHeaders })
  }
}
