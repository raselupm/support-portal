import { NextRequest, NextResponse, after } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { pusherServer, ticketChannel, EVT_TICKET_SEEN } from '@/lib/pusher'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session.email) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const staff = await isStaff(session.email)
  const seenAt = new Date().toISOString()

  if (staff) {
    await redis.set(`ticket_seen_staff:${id}`, seenAt)
  } else {
    await redis.set(`ticket_seen_customer:${id}`, seenAt)
  }

  after(
    pusherServer.trigger(ticketChannel(id), EVT_TICKET_SEEN, {
      seenBy: staff ? 'staff' : 'customer',
      seenAt,
    })
  )

  return NextResponse.json({ ok: true })
}
