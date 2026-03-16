import { NextRequest, NextResponse, after } from 'next/server'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { Ticket, User, Comment } from '@/lib/types'
import { sendTicketReplyEmail } from '@/lib/email'
import { pusherServer, ticketChannel, EVT_TICKET_COMMENT } from '@/lib/pusher'

// Each hop sleeps up to SLEEP_CHUNK ms then relays.
// maxDuration must be > SLEEP_CHUNK/1000 seconds.
export const maxDuration = 60 // seconds

const SLEEP_CHUNK = 50_000 // 50s per hop

export interface TicketNotifyPayload {
  ticketId: string
  commentId: string
  isStaff: boolean
  commentCreatedAt: string
  recipientEmails: string[]
  authorName: string
  sendAfter: number // Unix ms
  baseUrl: string
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const payload: TicketNotifyPayload = await request.json()

  after(async () => {
    try {
      const remaining = payload.sendAfter - Date.now()

      if (remaining > 1000) {
        // Sleep up to SLEEP_CHUNK ms then relay to next hop
        await new Promise<void>((r) => setTimeout(r, Math.min(remaining, SLEEP_CHUNK)))

        if (payload.sendAfter - Date.now() > 1000) {
          // Still not time — relay (await to ensure request is dispatched)
          await fetch(`${payload.baseUrl}/api/internal/ticket-notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify(payload),
          })
          return
        }
      }

      // Time is up — check seen and send email
      const { ticketId, isStaff, commentCreatedAt, recipientEmails, authorName } = payload

      const ticket = await redis.get<Ticket>(`ticket:${ticketId}`)
      if (!ticket) return

      let emailSent = false

      if (isStaff) {
        const seenAt = await redis.get<string>(`ticket_seen_customer:${ticketId}`)
        const wasSeen = seenAt && new Date(seenAt) > new Date(commentCreatedAt)
        if (!wasSeen) {
          const userRecord = await redis.get<User>(`user:${ticket.userEmail}`)
          if (userRecord?.receiveEmailNotifications !== false) {
            await sendTicketReplyEmail(ticket.userEmail, ticket, 'staff', authorName)
            emailSent = true
          }
        }
      } else {
        const seenAt = await redis.get<string>(`ticket_seen_staff:${ticketId}`)
        const wasSeen = seenAt && new Date(seenAt) > new Date(commentCreatedAt)
        if (!wasSeen) {
          const results = await Promise.allSettled(
            recipientEmails.map(async (email) => {
              const record = await redis.get<User>(`user:${email}`)
              if (record?.receiveNewTicketEmails !== false) {
                await sendTicketReplyEmail(email, ticket, 'customer', authorName)
                return true
              }
              return false
            })
          )
          emailSent = results.some((r) => r.status === 'fulfilled' && r.value === true)
        }
      }

      if (emailSent) {
        const now = new Date().toISOString()
        const systemComment: Comment = {
          id: nanoid(10),
          ticketId,
          authorEmail: '',
          content: 'Reply emailed',
          isAdmin: false,
          isSystem: true,
          createdAt: now,
        }
        await redis.rpush(`ticket_comments:${ticketId}`, JSON.stringify(systemComment))
        await pusherServer.trigger(ticketChannel(ticketId), EVT_TICKET_COMMENT, systemComment)
      }
    } catch (err) {
      console.error('[ticket-notify] background error:', err)
    }
  })

  return NextResponse.json({ ok: true })
}
