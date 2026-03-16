import { NextRequest, NextResponse, after } from 'next/server'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'
import { Chat, ChatMessage, ChatMeta } from '@/lib/types'
import { pusherServer, CHATS_CHANNEL, EVT_NEW_CHAT } from '@/lib/pusher'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, message, meta } = body

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required.' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const chatId = nanoid(10)
    const token = nanoid(20)
    const now = new Date().toISOString()
    const visitorEmail = email.trim().toLowerCase()
    const visitorName = name.trim()

    // Capture IP from request headers
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'Unknown'

    // Rate limit: max waiting chats per IP
    const chatLimit = parseInt(process.env.MAX_WAITING_CHATS_PER_IP || '2', 10)
    const ipChatIds = (await redis.smembers(`ip_chats:${ip}`)) as string[]
    let waitingCount = 0
    for (const cid of ipChatIds) {
      const c = await redis.get<Chat>(`chat:${cid}`)
      if (c?.status === 'waiting') waitingCount++
    }
    if (waitingCount >= chatLimit) {
      return NextResponse.json(
        { error: `You already have ${waitingCount} chat${waitingCount !== 1 ? 's' : ''} waiting for support. Please wait for an agent to respond before starting a new one.` },
        { status: 429, headers: corsHeaders }
      )
    }

    const chatMeta: ChatMeta = {
      currentPage: typeof meta?.currentPage === 'string' ? meta.currentPage : undefined,
      timezone: typeof meta?.timezone === 'string' ? meta.timezone : undefined,
      browser: typeof meta?.browser === 'string' ? meta.browser : undefined,
      os: typeof meta?.os === 'string' ? meta.os : undefined,
      language: typeof meta?.language === 'string' ? meta.language : undefined,
      ipAddress: ip,
    }

    const chat: Chat = {
      id: chatId,
      visitorEmail,
      visitorName,
      status: 'waiting',
      staffEmail: null,
      staffName: null,
      createdAt: now,
      updatedAt: now,
    }

    const messageId = nanoid(10)
    const chatMessage: ChatMessage = {
      id: messageId,
      chatId,
      sender: 'visitor',
      senderEmail: visitorEmail,
      senderName: visitorName,
      content: message.trim(),
      createdAt: now,
    }

    await redis.set(`chat:${chatId}`, JSON.stringify(chat))
    await redis.set(`chat_meta:${chatId}`, JSON.stringify(chatMeta))
    await redis.zadd('chats', { score: Date.now(), member: chatId })
    await redis.set(`chat_token:${token}`, chatId, { ex: 86400 })
    await redis.rpush(`chat_messages:${chatId}`, JSON.stringify(chatMessage))
    // Track chat ID per IP for rate limiting
    await redis.sadd(`ip_chats:${ip}`, chatId)

    after(pusherServer.trigger(CHATS_CHANNEL, EVT_NEW_CHAT, { chat, messageCount: 1 }))

    return NextResponse.json(
      { chatId, token },
      { status: 201, headers: corsHeaders }
    )
  } catch (err) {
    console.error('POST /api/chat/start error:', err)
    return NextResponse.json(
      { error: 'Failed to start chat.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
