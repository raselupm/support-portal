import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocCategory } from '@/lib/types'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import NewArticleForm from './new-article-form'

async function getCategories(): Promise<DocCategory[]> {
  const ids = (await redis.zrange('doc_categories', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return []
  const categories: DocCategory[] = []
  for (const id of ids) {
    const cat = await redis.get<DocCategory>(`doc_category:${id}`)
    if (cat) categories.push(cat)
  }
  return categories
}

export default async function NewArticlePage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (!(await isStaff(session.email))) redirect('/tickets')

  const categories = await getCategories()
  const products = (process.env.PRODUCTS || 'Product A,Product B,Product C')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-gray-700" />
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/docs" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Docs
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-xl font-bold text-gray-900">New Article</h1>
          </div>
        </div>
      </div>
      <NewArticleForm categories={categories} products={products} />
    </div>
  )
}
