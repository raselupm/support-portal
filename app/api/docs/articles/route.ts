import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { DocArticle } from '@/lib/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.toLowerCase().trim() || ''
  const product = searchParams.get('product')?.trim() || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

  const ids = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return NextResponse.json([])

  const articles: DocArticle[] = []
  for (const id of ids) {
    const article = await redis.get<DocArticle>(`doc_article:${id}`)
    if (!article) continue
    if (product && article.product !== product) continue
    if (q) {
      const haystack = (article.name + ' ' + article.content).toLowerCase()
      if (!haystack.includes(q)) continue
    }
    articles.push(article)
    if (articles.length >= limit) break
  }

  articles.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return NextResponse.json(articles)
}
