import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocArticle, DocCategory } from '@/lib/types'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ids = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return NextResponse.json([])

  const articles: DocArticle[] = []
  for (const id of ids) {
    const article = await redis.get<DocArticle>(`doc_article:${id}`)
    if (article) articles.push(article)
  }
  return NextResponse.json(articles)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, product, categoryId, content, order } = await request.json()

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!product || typeof product !== 'string' || !product.trim()) {
    return NextResponse.json({ error: 'Product is required.' }, { status: 400 })
  }
  if (!categoryId || typeof categoryId !== 'string') {
    return NextResponse.json({ error: 'Category is required.' }, { status: 400 })
  }
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Content is required.' }, { status: 400 })
  }

  const category = await redis.get<DocCategory>(`doc_category:${categoryId}`)
  if (!category) {
    return NextResponse.json({ error: 'Category not found.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const id = randomUUID()
  const article: DocArticle = {
    id,
    name: name.trim(),
    product: product.trim(),
    categoryId,
    categoryName: category.name,
    content,
    order: typeof order === 'number' ? order : 0,
    createdAt: now,
    updatedAt: now,
  }

  await redis.set(`doc_article:${id}`, JSON.stringify(article))
  await redis.zadd('doc_articles', { score: Date.now(), member: id })

  return NextResponse.json(article, { status: 201 })
}
