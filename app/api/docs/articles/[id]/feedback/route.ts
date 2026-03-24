import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

type Reaction = 'happy' | 'normal' | 'sad'
const VALID: Reaction[] = ['happy', 'normal', 'sad']
const COOKIE_PREFIX = 'sp_fb_'

function cookieName(id: string) {
  return COOKIE_PREFIX + id
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const key = `doc_article_feedback:${id}`

  const [happy, normal, sad] = await Promise.all([
    redis.hget<number>(key, 'happy'),
    redis.hget<number>(key, 'normal'),
    redis.hget<number>(key, 'sad'),
  ])

  const mine = request.cookies.get(cookieName(id))?.value || null

  return NextResponse.json({
    happy: Number(happy) || 0,
    normal: Number(normal) || 0,
    sad: Number(sad) || 0,
    mine: VALID.includes(mine as Reaction) ? mine : null,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { reaction } = await request.json() as { reaction: Reaction | null }
  const key = `doc_article_feedback:${id}`
  const cName = cookieName(id)

  const prev = request.cookies.get(cName)?.value as Reaction | undefined

  // Decrement previous reaction if any
  if (prev && VALID.includes(prev)) {
    const current = Number(await redis.hget<number>(key, prev)) || 0
    await redis.hset(key, { [prev]: Math.max(0, current - 1) })
  }

  const isSame = prev === reaction
  const next = isSame ? null : reaction

  // Increment new reaction if not toggling off
  if (next && VALID.includes(next)) {
    const current = Number(await redis.hget<number>(key, next)) || 0
    await redis.hset(key, { [next]: current + 1 })
  }

  const [happy, normal, sad] = await Promise.all([
    redis.hget<number>(key, 'happy'),
    redis.hget<number>(key, 'normal'),
    redis.hget<number>(key, 'sad'),
  ])

  const res = NextResponse.json({
    happy: Number(happy) || 0,
    normal: Number(normal) || 0,
    sad: Number(sad) || 0,
    mine: next,
  })

  // 1 year cookie, SameSite=Lax so it works on same-site navigations
  const maxAge = 60 * 60 * 24 * 365
  if (next) {
    res.cookies.set(cName, next, { maxAge, path: '/', sameSite: 'lax' })
  } else {
    res.cookies.set(cName, '', { maxAge: 0, path: '/', sameSite: 'lax' })
  }

  return res
}
