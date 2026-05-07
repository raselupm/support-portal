import { notFound } from 'next/navigation'
import { redis } from '@/lib/redis'
import { DocArticle } from '@/lib/types'
import ArticleClient from './article-client'
import DocsHeader from '../../docs-header'
import DocsCta from '../../docs-cta'

type ArticleGroup = {
  productId: string
  productName: string
  articles: { id: string; name: string }[]
}

async function getData(id: string) {
  const article = await redis.get<DocArticle>(`doc_article:${id}`)
  if (!article) return null

  const allIds = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  const allArticles = (
    await Promise.all(allIds.map((aid) => redis.get<DocArticle>(`doc_article:${aid}`)))
  ).filter(Boolean) as DocArticle[]

  // Articles in the same product (for prev/next navigation)
  const sameProduct = allArticles
    .filter((a) => a.productId === article.productId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const idx = sameProduct.findIndex((a) => a.id === id)
  const prev = idx > 0 ? { id: sameProduct[idx - 1].id, name: sameProduct[idx - 1].name } : null
  const next = idx < sameProduct.length - 1 ? { id: sameProduct[idx + 1].id, name: sameProduct[idx + 1].name } : null

  // Group all articles by product for sidebar
  const groupMap = new Map<string, ArticleGroup>()
  for (const a of allArticles.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    if (!groupMap.has(a.productId)) {
      groupMap.set(a.productId, { productId: a.productId, productName: a.productName, articles: [] })
    }
    groupMap.get(a.productId)!.articles.push({ id: a.id, name: a.name })
  }

  return { article, groups: Array.from(groupMap.values()), prev, next }
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  return (
    <>
      <DocsHeader appName={appName} wide />
      <ArticleClient article={data.article} groups={data.groups} prev={data.prev} next={data.next} cta={<DocsCta />} />
    </>
  )
}
