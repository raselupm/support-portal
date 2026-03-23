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
  return NextResponse.json(article)
}
