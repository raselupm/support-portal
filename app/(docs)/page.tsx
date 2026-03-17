import { redis } from '@/lib/redis'
import { DocArticle, DocCategory } from '@/lib/types'
import DocsHomeClient from './docs-home-client'
import DocsHeader from './docs-header'
import DocsCta from './docs-cta'

async function getData() {
  const [articleIds, categoryIds] = await Promise.all([
    redis.zrange('doc_articles', 0, -1, { rev: true }) as Promise<string[]>,
    redis.zrange('doc_categories', 0, -1, { rev: true }) as Promise<string[]>,
  ])

  const [articles, categories] = await Promise.all([
    Promise.all(
      articleIds.map((id) => redis.get<DocArticle>(`doc_article:${id}`))
    ).then((results) => results.filter(Boolean) as DocArticle[]),
    Promise.all(
      categoryIds.map((id) => redis.get<DocCategory>(`doc_category:${id}`))
    ).then((results) => results.filter(Boolean) as DocCategory[]),
  ])

  return { articles, categories }
}

export default async function DocsHomePage() {
  const { articles, categories } = await getData()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  return (
    <>
      <DocsHeader appName={appName} />
      <DocsHomeClient articles={articles} categories={categories} appName={appName} cta={<DocsCta />} />
    </>
  )
}
