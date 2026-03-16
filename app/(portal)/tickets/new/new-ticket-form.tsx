'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import TiptapEditor from '@/components/tiptap-editor'

const PRODUCTS = (process.env.NEXT_PUBLIC_PRODUCTS || process.env.PRODUCTS || 'Product A,Product B,Product C')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)

const MIN_TITLE = 10
const MAX_TITLE = 120
const MIN_DESCRIPTION = 20

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export default function NewTicketPage() {
  const router = useRouter()
  const [product, setProduct] = useState(PRODUCTS[0] || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ title: false, description: false })

  const descriptionText = stripHtml(description)
  const titleTooShort = touched.title && title.trim().length > 0 && title.trim().length < MIN_TITLE
  const descriptionTooShort = touched.description && descriptionText.length > 0 && descriptionText.length < MIN_DESCRIPTION

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setTouched({ title: true, description: true })

    if (!product) {
      setError('Please select a product.')
      return
    }
    if (!title.trim()) {
      setError('Please enter a title.')
      return
    }
    if (title.trim().length < MIN_TITLE) {
      setError(`Title must be at least ${MIN_TITLE} characters.`)
      return
    }
    if (title.trim().length > MAX_TITLE) {
      setError(`Title must be ${MAX_TITLE} characters or fewer.`)
      return
    }
    if (!description || description === '<p></p>' || !descriptionText) {
      setError('Please enter a description.')
      return
    }
    if (descriptionText.length < MIN_DESCRIPTION) {
      setError(`Description must be at least ${MIN_DESCRIPTION} characters.`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, title: title.trim(), description }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create ticket.')
        return
      }

      router.push(`/tickets/${data.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Create New Ticket</h1>
        <p className="text-sm text-gray-500 mt-1">Tell us about the issue you&apos;re experiencing.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1.5">
              Product
            </label>
            <select
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
            >
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <span className={`text-xs ${title.length > MAX_TITLE ? 'text-red-500' : 'text-gray-400'}`}>
                {title.length}/{MAX_TITLE}
              </span>
            </div>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              maxLength={MAX_TITLE}
              placeholder="Briefly describe the issue"
              disabled={loading}
              className={`w-full px-3 py-2.5 rounded-lg border text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm ${titleTooShort ? 'border-amber-400 bg-amber-50/40' : 'border-gray-300'}`}
            />
            {titleTooShort && (
              <p className="mt-1.5 text-xs text-amber-600">
                Title is too short — minimum {MIN_TITLE} characters ({title.trim().length}/{MIN_TITLE}).
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              {touched.description && descriptionText.length > 0 && (
                <span className={`text-xs ${descriptionText.length < MIN_DESCRIPTION ? 'text-amber-500' : 'text-gray-400'}`}>
                  {descriptionText.length} chars
                </span>
              )}
            </div>
            <div
              className={`border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${descriptionTooShort ? 'border-amber-400 bg-amber-50/40' : 'border-gray-300'}`}
            >
              <TiptapEditor
                content={description}
                onChange={(val) => {
                  setDescription(val)
                  setTouched((t) => ({ ...t, description: true }))
                }}
                placeholder="Describe your issue in detail..."
              />
            </div>
            {descriptionTooShort && (
              <p className="mt-1.5 text-xs text-amber-600">
                Description is too short — minimum {MIN_DESCRIPTION} characters ({descriptionText.length}/{MIN_DESCRIPTION}).
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </button>
            <Link
              href="/tickets"
              className="text-sm text-gray-500 hover:text-gray-700 transition px-3 py-2.5"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
