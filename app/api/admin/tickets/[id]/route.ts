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

  const ticket = await redis.get(`ticket:${id}`)
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
  }

  await Promise.all([
    redis.del(`ticket:${id}`),
    redis.del(`ticket_comments:${id}`),
    redis.zrem('tickets', id),
  ])

  return NextResponse.json({ ok: true })
}
