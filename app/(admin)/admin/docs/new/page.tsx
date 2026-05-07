import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocProduct } from '@/lib/types'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import NewArticleForm from './new-article-form'

async function getProducts(): Promise<DocProduct[]> {
  const ids = (await redis.zrange('doc_products', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return []
  const products: DocProduct[] = []
  for (const id of ids) {
    const prod = await redis.get<DocProduct>(`doc_product:${id}`)
    if (prod) products.push(prod)
  }
  return products
}

export default async function NewArticlePage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (!(await isStaff(session.email))) redirect('/tickets')

  const products = await getProducts()

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
      <NewArticleForm products={products} />
    </div>
  )
}
