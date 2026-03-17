import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocArticle, DocCategory } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const article = await redis.get<DocArticle>(`doc_article:${id}`)
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(article)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await redis.get<DocArticle>(`doc_article:${id}`)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, product, categoryId, content } = await request.json()

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

  const updated: DocArticle = {
    ...existing,
    name: name.trim(),
    product: product.trim(),
    categoryId,
    categoryName: category.name,
    content,
    updatedAt: new Date().toISOString(),
  }

  await redis.set(`doc_article:${id}`, JSON.stringify(updated))
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await Promise.all([
    redis.del(`doc_article:${id}`),
    redis.zrem('doc_articles', id),
  ])

  return NextResponse.json({ ok: true })
}
