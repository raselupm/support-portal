import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { DocArticle } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await redis.get<DocArticle>(`doc_article:${id}`)
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allIds = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  const allArticles = (
    await Promise.all(allIds.map((aid) => redis.get<DocArticle>(`doc_article:${aid}`)))
  ).filter(Boolean) as DocArticle[]

  const siblings = allArticles
    .filter((a) => a.product === article.product && a.categoryId === article.categoryId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const idx = siblings.findIndex((a) => a.id === id)
  const prev = idx > 0 ? { id: siblings[idx - 1].id, name: siblings[idx - 1].name } : null
  const next = idx < siblings.length - 1 ? { id: siblings[idx + 1].id, name: siblings[idx + 1].name } : null

  return NextResponse.json({ ...article, prev, next })
}
