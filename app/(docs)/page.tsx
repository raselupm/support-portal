import { redis } from '@/lib/redis'
import { DocArticle, DocProduct } from '@/lib/types'
import DocsHomeClient from './docs-home-client'
import DocsHeader from './docs-header'
import DocsCta from './docs-cta'

async function getData() {
  const [articleIds, productIds] = await Promise.all([
    redis.zrange('doc_articles', 0, -1, { rev: true }) as Promise<string[]>,
    redis.zrange('doc_products', 0, -1, { rev: true }) as Promise<string[]>,
  ])

  const [articles, products] = await Promise.all([
    Promise.all(
      articleIds.map((id) => redis.get<DocArticle>(`doc_article:${id}`))
    ).then((results) => results.filter(Boolean) as DocArticle[]),
    Promise.all(
      productIds.map((id) => redis.get<DocProduct>(`doc_product:${id}`))
    ).then((results) => results.filter(Boolean) as DocProduct[]),
  ])

  return { articles, products }
}

export default async function DocsHomePage() {
  const { articles, products } = await getData()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  return (
    <>
      <DocsHeader appName={appName} />
      <DocsHomeClient articles={articles} products={products} appName={appName} cta={<DocsCta />} />
    </>
  )
}
