import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'

interface RouteParams {
  params: Promise<{ email: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session.email || !isAdmin(session.email)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { email } = await params
    const normalizedEmail = decodeURIComponent(email).trim().toLowerCase()

    const existing = await redis.get(`staff:${normalizedEmail}`)
    if (!existing) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    await redis.del(`staff:${normalizedEmail}`)
    await redis.zrem('staff_list', normalizedEmail)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/staff/[email] error:', err)
    return NextResponse.json({ error: 'Failed to remove staff member.' }, { status: 500 })
  }
}
