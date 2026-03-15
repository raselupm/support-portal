import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket, Comment } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await getSession()

    if (!session.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const ticket = await redis.get<Ticket>(`ticket:${id}`)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
    }

    const admin = isAdmin(session.email)

    // Customers can only view their own tickets
    if (!admin && ticket.userEmail !== session.email) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const rawComments = await redis.lrange(`ticket_comments:${id}`, 0, -1)
    const comments: Comment[] = rawComments
      .map((c) => {
        if (typeof c === 'string') {
          try {
            return JSON.parse(c) as Comment
          } catch {
            return null
          }
        }
        return c as Comment
      })
      .filter((c): c is Comment => c !== null)

    return NextResponse.json({ ticket, comments })
  } catch (err) {
    console.error('GET /api/tickets/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch ticket.' }, { status: 500 })
  }
}
