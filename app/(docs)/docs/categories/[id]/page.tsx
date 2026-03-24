import { notFound } from 'next/navigation'
import Link from 'next/link'
import { redis } from '@/lib/redis'
import { DocArticle, DocCategory } from '@/lib/types'
import { FileText, ChevronRight } from 'lucide-react'
import DocsHeader from '../../../docs-header'
import DocsCta from '../../../docs-cta'

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

async function getData(id: string) {
  const category = await redis.get<DocCategory>(`doc_category:${id}`)
  if (!category) return null

  const allIds = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  const allArticles = (
    await Promise.all(allIds.map((aid) => redis.get<DocArticle>(`doc_article:${aid}`)))
  ).filter(Boolean) as DocArticle[]

  const articles = allArticles
    .filter((a) => a.categoryId === id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return { category, articles }
}

export default async function CategoryArchivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()

  const { category, articles } = data
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  return (
    <>
      <DocsHeader appName={appName} />
    <div className="flex-1 bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Link href="/" className="hover:text-gray-600 transition">Docs</Link>
          <span>/</span>
          <span className="text-gray-600">{category.name}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{category.name}</h1>
        <p className="text-sm text-gray-500 mb-8">
          {articles.length} article{articles.length !== 1 ? 's' : ''} in this category
        </p>

        {/* Article list */}
        {articles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No articles in this category yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {articles.map((article) => {
              const excerpt = stripHtml(article.content).slice(0, 180)
              const hasMore = stripHtml(article.content).length > 180
              return (
                <Link
                  key={article.id}
                  href={`/docs/${article.id}`}
                  className="flex items-start gap-4 px-6 py-5 hover:bg-blue-50/50 transition-colors group"
                >
                  <FileText className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors mb-1">
                      {article.name}
                    </p>
                    {excerpt && (
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {excerpt}{hasMore ? '…' : ''}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                </Link>
              )
            })}
          </div>
        )}

        <DocsCta />
      </main>
    </div>
    </>
  )
}
