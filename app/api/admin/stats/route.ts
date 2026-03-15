import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket, StaffMember } from '@/lib/types'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.email || !isAdmin(session.email)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    // 1. Ticket counts by status
    const allTicketIds = await redis.zrange('tickets', 0, -1)
    const counts = { total: 0, open: 0, customer_reply: 0, replied: 0 }

    const allTickets: Ticket[] = []
    for (const id of allTicketIds) {
      const ticket = await redis.get<Ticket>(`ticket:${id}`)
      if (ticket) {
        allTickets.push(ticket)
        counts.total++
        if (ticket.status === 'open') counts.open++
        else if (ticket.status === 'customer_reply') counts.customer_reply++
        else if (ticket.status === 'replied') counts.replied++
      }
    }

    // 2. Weekly new tickets (last 7 days)
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const dayEnd = dayStart + 86400000 - 1
      const count = await redis.zcount('tickets', dayStart, dayEnd)
      weeklyData.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toISOString().split('T')[0],
        count: count as number,
      })
    }

    // 3. Staff performance this week
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysFromMon)

    const staffIds = await redis.zrange('staff_list', 0, -1)
    const staffPerformance = await Promise.all(
      staffIds.map(async (email) => {
        const staffData = await redis.get<StaffMember>(`staff:${email}`)
        let repliesThisWeek = 0
        const tempDate = new Date(monday)
        while (tempDate <= now) {
          const dateStr = tempDate.toISOString().split('T')[0]
          const count = await redis.get(`staff_replies:${email}:${dateStr}`)
          repliesThisWeek += count ? Number(count) : 0
          tempDate.setDate(tempDate.getDate() + 1)
        }
        return {
          email: email as string,
          name: staffData?.name || (email as string),
          repliesThisWeek,
        }
      })
    )

    // 4. Recent 5 tickets
    const recentIds = await redis.zrange('tickets', 0, 4, { rev: true })
    const recentTickets: Ticket[] = []
    for (const id of recentIds) {
      const ticket = await redis.get<Ticket>(`ticket:${id}`)
      if (ticket) recentTickets.push(ticket)
    }

    return NextResponse.json({
      counts,
      weekly: weeklyData,
      staffPerformance,
      recentTickets,
    })
  } catch (err) {
    console.error('GET /api/admin/stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch stats.' }, { status: 500 })
  }
}
