import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST() {
  try {
    const session = await getSession()
    session.destroy()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('logout error:', err)
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 })
  }
}
