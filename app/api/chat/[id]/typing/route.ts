import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { pusherServer, chatChannel } from '@/lib/pusher'

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

  let senderName: string
  let sender: 'visitor' | 'staff'

  if (body.token) {
    // Visitor typing
    const storedChatId = await redis.get(`chat_token:${body.token}`)
    if (storedChatId !== id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }
    const chat = await redis.get<{ visitorName?: string; visitorEmail?: string }>(`chat:${id}`)
    senderName = chat?.visitorName || chat?.visitorEmail || 'Visitor'
    sender = 'visitor'
  } else {
    // Staff typing
    const session = await getSession()
    if (!session.email || !(await isStaff(session.email))) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    const staffRecord = await redis.get<{ name?: string }>(`staff:${session.email}`)
    senderName = staffRecord?.name || 'Support Staff'
    sender = 'staff'
  }

  await pusherServer.trigger(chatChannel(id), 'typing', { name: senderName, sender })

  return NextResponse.json({ ok: true }, { headers: corsHeaders })
}
