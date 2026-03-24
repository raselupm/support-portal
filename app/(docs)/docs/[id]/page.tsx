import { notFound } from 'next/navigation'
import { redis } from '@/lib/redis'
import { DocArticle } from '@/lib/types'
import ArticleClient from './article-client'
import DocsHeader from '../../docs-header'
import DocsCta from '../../docs-cta'

type ArticleGroup = {
  categoryId: string
  categoryName: string
  articles: { id: string; name: string }[]
}

async function getData(id: string) {
  const article = await redis.get<DocArticle>(`doc_article:${id}`)
  if (!article) return null

  // Get all articles with same product for sidebar
  const allIds = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  const allArticles = (
    await Promise.all(allIds.map((aid) => redis.get<DocArticle>(`doc_article:${aid}`)))
  ).filter(Boolean) as DocArticle[]

  const sameProduct = allArticles
    .filter((a) => a.product === article.product)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const sameCategory = sameProduct.filter((a) => a.product === article.product && a.categoryId === article.categoryId)
  const idx = sameCategory.findIndex((a) => a.id === id)
  const prev = idx > 0 ? { id: sameCategory[idx - 1].id, name: sameCategory[idx - 1].name } : null
  const next = idx < sameCategory.length - 1 ? { id: sameCategory[idx + 1].id, name: sameCategory[idx + 1].name } : null

  // Group by category
  const groupMap = new Map<string, ArticleGroup>()
  for (const a of sameProduct) {
    if (!groupMap.has(a.categoryId)) {
      groupMap.set(a.categoryId, { categoryId: a.categoryId, categoryName: a.categoryName, articles: [] })
    }
    groupMap.get(a.categoryId)!.articles.push({ id: a.id, name: a.name })
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
