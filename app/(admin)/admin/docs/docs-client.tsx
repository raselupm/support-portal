'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { DocArticle } from '@/lib/types'

type FeedbackCounts = { happy: number; normal: number; sad: number }

const FACE_SVGS = {
  happy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
      <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  normal: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
      <circle cx="12" cy="12" r="10" /><line x1="8" y1="15" x2="16" y2="15" />
      <circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  sad: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <circle cx="12" cy="12" r="10" /><path d="M8 17s1.5-2 4-2 4 2 4 2" />
      <circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
}

export default function DocsClient({ initialArticles }: { initialArticles: DocArticle[] }) {
  const [articles, setArticles] = useState<DocArticle[]>(initialArticles)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackCounts>>({})

  useEffect(() => {
    Promise.all(
      initialArticles.map((a) =>
        fetch(`/api/docs/articles/${a.id}/feedback`)
          .then((r) => r.json())
          .then((d) => ({ id: a.id, counts: { happy: d.happy, normal: d.normal, sad: d.sad } }))
          .catch(() => ({ id: a.id, counts: { happy: 0, normal: 0, sad: 0 } }))
      )
    ).then((results) => {
      const map: Record<string, FeedbackCounts> = {}
      results.forEach(({ id, counts }) => { map[id] = counts })
      setFeedbacks(map)
    })
  }, [initialArticles])

  async function handleDelete(id: string) {
    if (!confirm('Delete this article? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/docs/articles/${id}`, { method: 'DELETE' })
      if (res.ok) setArticles((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  function FeedbackBadges({ id }: { id: string }) {
    const f = feedbacks[id]
    if (!f) return <span className="text-gray-300 text-xs">—</span>
    return (
      <div className="flex items-center gap-2">
        {(['happy', 'normal', 'sad'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1">
            {FACE_SVGS[k]}
            <span className="text-xs text-gray-600">{f[k]}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/docs/categories"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Manage categories
          </Link>
        </div>
        <Link
          href="/admin/docs/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a doc article
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {articles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">No articles yet</p>
            <p className="text-sm mt-1">Click &quot;Add a doc article&quot; to create your first one.</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-100">
              {articles.map((article) => (
                <div key={article.id} className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{article.name}</p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">{article.product}</span>
                      <span>{article.categoryName}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}</span>
                    </div>
                    <FeedbackBadges id={article.id} />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link
                      href={`/admin/docs/${article.id}/edit`}
                      className="inline-flex items-center p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deleting === article.id}
                      className="inline-flex items-center p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Feedback</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{article.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                        {article.product}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{article.categoryName}</td>
                    <td className="px-4 py-3">
                      <FeedbackBadges id={article.id} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/docs/${article.id}/edit`}
                          className="inline-flex items-center p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(article.id)}
                          disabled={deleting === article.id}
                          className="inline-flex items-center p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
