import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { StaffMember } from '@/lib/types'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.email || !isAdmin(session.email)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const emails = await redis.zrange('staff_list', 0, -1)
    const staffList: StaffMember[] = []

    for (const email of emails) {
      const member = await redis.get<StaffMember>(`staff:${email}`)
      if (member) staffList.push(member)
    }

    return NextResponse.json({ staff: staffList })
  } catch (err) {
    console.error('GET /api/admin/staff error:', err)
    return NextResponse.json({ error: 'Failed to fetch staff.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.email || !isAdmin(session.email)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check not already an admin
    if (isAdmin(normalizedEmail)) {
      return NextResponse.json({ error: 'This email belongs to an admin.' }, { status: 400 })
    }

    // Check not already staff
    const existing = await redis.get(`staff:${normalizedEmail}`)
    if (existing) {
      return NextResponse.json({ error: 'This person is already a staff member.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const staffMember: StaffMember = {
      email: normalizedEmail,
      name: name.trim(),
      createdAt: now,
      createdBy: session.email,
    }

    await redis.set(`staff:${normalizedEmail}`, JSON.stringify(staffMember))
    await redis.zadd('staff_list', { score: Date.now(), member: normalizedEmail })

    return NextResponse.json({ staff: staffMember }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/staff error:', err)
    return NextResponse.json({ error: 'Failed to create staff member.' }, { status: 500 })
  }
}
