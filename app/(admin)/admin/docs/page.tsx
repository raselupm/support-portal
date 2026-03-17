import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocArticle } from '@/lib/types'
import { BookOpen } from 'lucide-react'
import DocsClient from './docs-client'

async function getArticles(): Promise<DocArticle[]> {
  const ids = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return []

  const articles: DocArticle[] = []
  for (const id of ids) {
    const article = await redis.get<DocArticle>(`doc_article:${id}`)
    if (article) articles.push(article)
  }
  return articles
}

export default async function DocsPage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (!(await isStaff(session.email))) redirect('/tickets')

  const articles = await getArticles()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Docs</h1>
      </div>
      <DocsClient initialArticles={articles} />
    </div>
  )
}
