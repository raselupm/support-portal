import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket, Comment } from '@/lib/types'
import { nanoid } from 'nanoid'
import { pusherServer, TICKETS_CHANNEL, EVT_TICKET_REPLY, ticketChannel, EVT_TICKET_COMMENT } from '@/lib/pusher'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await getSession()

    if (!session.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required.' }, { status: 400 })
    }

    const ticket = await redis.get<Ticket>(`ticket:${id}`)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })
    }

    const admin = isAdmin(session.email)
    const staff = await isStaff(session.email)

    // Customers can only comment on their own tickets
    if (!staff && ticket.userEmail !== session.email) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const comment: Comment = {
      id: nanoid(10),
      ticketId: id,
      authorEmail: session.email,
      content,
      isAdmin: staff,
      createdAt: now,
    }

    // Append comment to ticket's comment list
    await redis.rpush(`ticket_comments:${id}`, JSON.stringify(comment))

    // Update ticket status based on who is commenting
    const newStatus: Ticket['status'] = staff ? 'replied' : 'customer_reply'
    const updatedTicket: Ticket = {
      ...ticket,
      status: newStatus,
      updatedAt: now,
    }
    await redis.set(`ticket:${id}`, JSON.stringify(updatedTicket))

    // Broadcast comment to anyone viewing this ticket
    await pusherServer.trigger(ticketChannel(id), EVT_TICKET_COMMENT, comment)

    // Track staff reply stats / notify admin for customer replies
    if (staff) {
      const today = new Date().toISOString().split('T')[0]
      await redis.incr(`replies_by_day:${today}`)
      await redis.incr(`staff_replies:${session.email}:${today}`)
    } else {
      // Customer replied — notify admin/staff
      await pusherServer.trigger(TICKETS_CHANNEL, EVT_TICKET_REPLY, {
        id: ticket.id,
        title: ticket.title,
        userEmail: ticket.userEmail,
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tickets/[id]/comments error:', err)
    return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 })
  }
}
