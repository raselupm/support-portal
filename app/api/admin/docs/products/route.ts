import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocProduct } from '@/lib/types'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ids = (await redis.zrange('doc_products', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return NextResponse.json([])

  const products: DocProduct[] = []
  for (const id of ids) {
    const prod = await redis.get<DocProduct>(`doc_product:${id}`)
    if (prod) products.push(prod)
  }
  return NextResponse.json(products)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Product name is required.' }, { status: 400 })
  }

  const id = randomUUID()
  const product: DocProduct = { id, name: name.trim(), createdAt: new Date().toISOString() }
  await redis.set(`doc_product:${id}`, JSON.stringify(product))
  await redis.zadd('doc_products', { score: Date.now(), member: id })

  return NextResponse.json(product, { status: 201 })
}
