import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { Ticket, User, Comment } from '@/lib/types'
import { sendTicketReplyEmail } from '@/lib/email'
import { pusherServer, ticketChannel, EVT_TICKET_COMMENT } from '@/lib/pusher'

// Each hop can sleep up to SLEEP_CHUNK ms before relaying to the next hop.
// Set maxDuration slightly above SLEEP_CHUNK to give the function breathing room.
export const maxDuration = 60 // seconds — increase on Pro plan if needed

const SLEEP_CHUNK = 50_000 // 50s per hop

export interface TicketNotifyPayload {
  ticketId: string
  commentId: string
  isStaff: boolean
  commentCreatedAt: string
  recipientEmails: string[]
  authorName: string
  sendAfter: number // Unix ms timestamp
  baseUrl: string
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const payload: TicketNotifyPayload = await request.json()

  waitUntil(
    (async () => {
      const remaining = payload.sendAfter - Date.now()

      if (remaining > 1000) {
        // Not time yet — sleep for up to SLEEP_CHUNK ms then relay
        await new Promise<void>((r) => setTimeout(r, Math.min(remaining, SLEEP_CHUNK)))

        if (payload.sendAfter - Date.now() > 1000) {
          // Still not time — fire next hop and exit
          fetch(`${payload.baseUrl}/api/internal/ticket-notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify(payload),
          }).catch(console.error)
          return
        }
      }

      // Time is up — check seen and send email
      const { ticketId, isStaff, commentCreatedAt, recipientEmails, authorName } = payload

      const ticket = await redis.get<Ticket>(`ticket:${ticketId}`)
      if (!ticket) return

      let emailSent = false

      if (isStaff) {
        // Staff replied → notify customer if they haven't seen it
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
        // Customer replied → notify staff who haven't seen it
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

      // Add system message so the thread shows the email was sent
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
    })()
  )

  return NextResponse.json({ ok: true })
}
