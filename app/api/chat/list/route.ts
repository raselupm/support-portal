import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Chat } from '@/lib/types'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const staffCheck = await isStaff(session.email)
    if (!staffCheck) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    // Get all chat IDs sorted by newest first
    const chatIds = (await redis.zrange('chats', 0, -1, { rev: true })) as string[]

    if (chatIds.length === 0) {
      return NextResponse.json({ chats: [] })
    }

    const chats: (Chat & { messageCount: number })[] = []

    for (const id of chatIds) {
      const chatData = await redis.get<Chat>(`chat:${id}`)
      if (chatData) {
        const messageCount = await redis.llen(`chat_messages:${id}`)
        chats.push({ ...chatData, messageCount })
      }
    }

    return NextResponse.json({ chats })
  } catch (err) {
    console.error('GET /api/chat/list error:', err)
    return NextResponse.json({ error: 'Failed to fetch chats.' }, { status: 500 })
  }
}
