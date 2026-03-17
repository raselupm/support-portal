'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { DocArticle, DocCategory } from '@/lib/types'

const TiptapEditor = dynamic(() => import('@/components/tiptap-editor'), { ssr: false })

const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'
const inputCls =
  'w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

export default function EditArticleForm({
  article,
  categories,
  products,
}: {
  article: DocArticle
  categories: DocCategory[]
  products: string[]
}) {
  const router = useRouter()
  const [name, setName] = useState(article.name)
  const [product, setProduct] = useState(article.product)
  const [categoryId, setCategoryId] = useState(article.categoryId)
  const [content, setContent] = useState(article.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Name is required.'); return }
    if (!product) { setError('Product is required.'); return }
    if (!categoryId) { setError('Please select a category.'); return }
    const text = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!text) { setError('Content is required.'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/docs/articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, product, categoryId, content }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save article.'); return }
      router.push('/admin/docs')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className={labelCls}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Article title"
            className={inputCls}
            disabled={saving}
          />
        </div>

        {/* Product */}
        <div>
          <label className={labelCls}>Product</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className={inputCls}
            disabled={saving}
          >
            {products.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <a href="/admin/docs/categories" target="_blank" className="text-xs text-blue-600 hover:underline">
              Manage categories
            </a>
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
            disabled={saving}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div>
          <label className={labelCls}>Details</label>
          <TiptapEditor content={content} onChange={setContent} placeholder="Write your article content here…" />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <a href="/admin/docs" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </a>
      </div>
    </form>
  )
}
