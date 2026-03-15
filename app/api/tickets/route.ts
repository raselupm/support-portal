import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket } from '@/lib/types'
import { nanoid } from 'nanoid'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const admin = isAdmin(session.email)
    let ticketIds: string[] = []

    if (admin) {
      const results = await redis.zrange('tickets', 0, -1, { rev: true })
      ticketIds = results as string[]
    } else {
      const results = await redis.zrange(`user_tickets:${session.email}`, 0, -1, { rev: true })
      ticketIds = results as string[]
    }

    if (ticketIds.length === 0) {
      return NextResponse.json({ tickets: [] })
    }

    const tickets: Ticket[] = []
    for (const id of ticketIds) {
      const ticket = await redis.get<Ticket>(`ticket:${id}`)
      if (ticket) tickets.push(ticket)
    }

    return NextResponse.json({ tickets })
  } catch (err) {
    console.error('GET /api/tickets error:', err)
    return NextResponse.json({ error: 'Failed to fetch tickets.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { product, title, description } = body

    if (!product || typeof product !== 'string' || !product.trim()) {
      return NextResponse.json({ error: 'Product is required.' }, { status: 400 })
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }
    if (title.trim().length > 120) {
      return NextResponse.json({ error: 'Title must be 120 characters or fewer.' }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 })
    }

    const id = nanoid(10)
    const now = new Date().toISOString()
    const score = Date.now()

    const ticket: Ticket = {
      id,
      userEmail: session.email,
      product: product.trim(),
      title: title.trim(),
      description,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }

    // Store ticket data
    await redis.set(`ticket:${id}`, JSON.stringify(ticket))

    // Add to global tickets sorted set (score = timestamp for ordering)
    await redis.zadd('tickets', { score, member: id })

    // Add to user's tickets sorted set
    await redis.zadd(`user_tickets:${session.email}`, { score, member: id })

    return NextResponse.json({ id, ticket }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tickets error:', err)
    return NextResponse.json({ error: 'Failed to create ticket.' }, { status: 500 })
  }
}
