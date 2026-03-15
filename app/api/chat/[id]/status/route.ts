import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { Chat } from '@/lib/types'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token required.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify token
    const storedChatId = await redis.get(`chat_token:${token}`)
    if (storedChatId !== id) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const chat = await redis.get<Chat>(`chat:${id}`)
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found.' },
        { status: 404, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { status: chat.status, staffName: chat.staffName },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('GET /api/chat/[id]/status error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch status.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
