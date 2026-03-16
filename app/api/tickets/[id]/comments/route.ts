import { NextRequest, NextResponse, after } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket, Comment } from '@/lib/types'
import { nanoid } from 'nanoid'
import { pusherServer, TICKETS_CHANNEL, EVT_TICKET_REPLY, ticketChannel, EVT_TICKET_COMMENT } from '@/lib/pusher'
import type { TicketNotifyPayload } from '@/app/api/internal/ticket-notify/route'

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

    // Capture base URL before entering async context
    const baseUrl = new URL(request.url).origin

    after(async () => {
      try {
        // 1. Broadcast comment to anyone viewing this ticket
        await pusherServer.trigger(ticketChannel(id), EVT_TICKET_COMMENT, comment)

        if (staff) {
          const today = now.split('T')[0]
          await Promise.all([
            redis.incr(`replies_by_day:${today}`),
            redis.incr(`staff_replies:${session.email}:${today}`),
          ])
        } else {
          await pusherServer.trigger(TICKETS_CHANNEL, EVT_TICKET_REPLY, {
            id: ticket.id,
            title: ticket.title,
            userEmail: ticket.userEmail,
          })
        }

        // 2. Resolve author display name
        const [authorUser, authorStaff] = await Promise.all([
          redis.get<{ name?: string }>(`user:${session.email}`),
          redis.get<{ name?: string }>(`staff:${session.email}`),
        ])
        const authorName = authorUser?.name?.trim() || authorStaff?.name?.trim() || session.email

        // 3. Build recipient list
        const recipientEmails = staff
          ? [ticket.userEmail]
          : [
              ...new Set([
                ...((await redis.zrange('staff_list', 0, -1)) as string[]),
                ...(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
              ]),
            ]

        // 4. Kick off self-relaying delayed notification (awaited to confirm receipt)
        const payload: TicketNotifyPayload = {
          ticketId: id,
          commentId: comment.id,
          isStaff: staff,
          commentCreatedAt: now,
          recipientEmails,
          authorName,
          sendAfter: Date.now() + 2 * 60 * 1000,
          baseUrl,
        }

        await fetch(`${baseUrl}/api/internal/ticket-notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify(payload),
        })
      } catch (err) {
        console.error('[comments] after() error:', err)
      }
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tickets/[id]/comments error:', err)
    return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 })
  }
}
