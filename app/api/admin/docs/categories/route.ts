import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocCategory } from '@/lib/types'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ids = (await redis.zrange('doc_categories', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return NextResponse.json([])

  const categories: DocCategory[] = []
  for (const id of ids) {
    const cat = await redis.get<DocCategory>(`doc_category:${id}`)
    if (cat) categories.push(cat)
  }
  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })
  }

  const id = randomUUID()
  const category: DocCategory = { id, name: name.trim(), createdAt: new Date().toISOString() }
  await redis.set(`doc_category:${id}`, JSON.stringify(category))
  await redis.zadd('doc_categories', { score: Date.now(), member: id })

  return NextResponse.json(category, { status: 201 })
}
