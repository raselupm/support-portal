import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session.email || !isAdmin(session.email)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  await Promise.all([
    redis.del(`chat:${id}`),
    redis.del(`chat_messages:${id}`),
    redis.del(`chat_meta:${id}`),
    redis.del(`chat_token:${id}`),
    redis.del(`chat_history_sent:${id}`),
    redis.zrem('chats', id),
  ])

  return NextResponse.json({ ok: true })
}
