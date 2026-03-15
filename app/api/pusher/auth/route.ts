import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { pusherServer } from '@/lib/pusher'

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')
  const channelName = params.get('channel_name')

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
  }

  const email = session.email.trim().toLowerCase()
  const staffRecord = await redis.get<{ name: string }>(`staff:${email}`)
  const name = staffRecord?.name || email

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
    user_id: email,
    user_info: { email, name },
  })

  return NextResponse.json(authResponse)
}
