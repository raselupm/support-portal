import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'

// POST: heartbeat (keeps staff_heartbeat key alive)
// POST ?_method=DELETE: tab-close cleanup via sendBeacon (can only POST)
// DELETE: explicit logout cleanup
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.email) return NextResponse.json({ ok: true })

  const email = session.email.trim().toLowerCase()
  const { searchParams } = new URL(request.url)

  if (searchParams.get('_method') === 'DELETE') {
    await redis.del(`staff_heartbeat:${email}`)
    return NextResponse.json({ ok: true })
  }

  if (!(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await redis.set(`staff_heartbeat:${email}`, '1', { ex: 35 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getSession()
  if (!session.email) return NextResponse.json({ ok: true })

  await redis.del(`staff_heartbeat:${session.email.trim().toLowerCase()}`)
  return NextResponse.json({ ok: true })
}
