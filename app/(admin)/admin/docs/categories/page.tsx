import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { DocCategory } from '@/lib/types'
import { Tag } from 'lucide-react'
import Link from 'next/link'
import CategoriesClient from './categories-client'

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

export default async function CategoriesPage() {
  const session = await getSession()
  if (!session.email) redirect('/login')
  if (!(await isStaff(session.email))) redirect('/tickets')

  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-gray-700" />
        <div className="flex items-center gap-2">
          <Link href="/admin/docs" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Docs
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
        </div>
      </div>
      <CategoriesClient initialCategories={categories} />
    </div>
  )
}
