import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { pusherServer, chatChannel, EVT_MESSAGES_SEEN } from '@/lib/pusher'

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
  const body = await request.json().catch(() => ({}))
  const seenAt = new Date().toISOString()

  let seenBy: 'visitor' | 'staff'

  if (body.token) {
    const storedChatId = await redis.get(`chat_token:${body.token}`)
    if (storedChatId !== id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }
    seenBy = 'visitor'
    await redis.set(`chat_seen_visitor:${id}`, seenAt)
  } else {
    const session = await getSession()
    if (!session.email || !(await isStaff(session.email))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    seenBy = 'staff'
    await redis.set(`chat_seen_staff:${id}`, seenAt)
  }

  await pusherServer.trigger(chatChannel(id), EVT_MESSAGES_SEEN, { seenBy, seenAt })

  return NextResponse.json({ ok: true }, { headers: corsHeaders })
}
