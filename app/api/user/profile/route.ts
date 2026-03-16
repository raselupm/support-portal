import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { redis } from '@/lib/redis'
import { User } from '@/lib/types'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.email) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  const existing = await redis.get<User>(`user:${session.email}`)
  const updated: User = {
    email: session.email,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    name,
    receiveEmailNotifications:
      typeof body.receiveEmailNotifications === 'boolean'
        ? body.receiveEmailNotifications
        : (existing?.receiveEmailNotifications ?? true),
    receiveNewTicketEmails:
      typeof body.receiveNewTicketEmails === 'boolean'
        ? body.receiveNewTicketEmails
        : (existing?.receiveNewTicketEmails ?? true),
  }

  await redis.set(`user:${session.email}`, updated)

  return NextResponse.json({ ok: true })
}
