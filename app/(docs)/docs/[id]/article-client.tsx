'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DocArticle } from '@/lib/types'
import ArticleFeedback from '@/components/article-feedback'

type ArticleGroup = {
  categoryId: string
  categoryName: string
  articles: { id: string; name: string }[]
}

type TocItem = { id: string; text: string; level: number }

function buildToc(html: string): TocItem[] {
  const items: TocItem[] = []
  const regex = /<(h[1-3])[^>]*>(.*?)<\/h[1-3]>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1][1])
    const text = match[2].replace(/<[^>]*>/g, '').trim()
    if (text) {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      items.push({ id, text, level })
    }
  }
  return items
}

function injectHeadingIds(html: string): string {
  return html.replace(/<(h[1-3])([^>]*)>(.*?)<\/h[1-3]>/gi, (_, tag, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').trim()
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return `<${tag}${attrs} id="${id}">${inner}</${tag}>`
  })
}

// ── Sidebar Accordion ────────────────────────────────────────────────────────
function SidebarAccordion({
  groups,
  currentArticleId,
  currentCategoryId,
}: {
  groups: ArticleGroup[]
  currentArticleId: string
  currentCategoryId: string
}) {
  const [open, setOpen] = useState<Set<string>>(new Set([currentCategoryId]))

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <nav className="space-y-1">
      {groups.map((group) => {
        const isOpen = open.has(group.categoryId)
        return (
          <div key={group.categoryId} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(group.categoryId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
            >
              <span className="text-sm font-medium text-gray-700">{group.categoryName}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <ul className="divide-y divide-gray-100">
                {group.articles.map((a) => {
                  const isCurrent = a.id === currentArticleId
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/docs/${a.id}`}
                        className={`block px-4 py-2.5 text-sm transition-colors ${
                          isCurrent
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {a.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ── Table of Contents ────────────────────────────────────────────────────────
function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[]
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px' }
    )
    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">On this page</p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block text-sm py-0.5 transition-colors ${
            item.level === 2 ? 'pl-3' : item.level === 3 ? 'pl-6' : ''
          } ${
            active === item.id
              ? 'text-blue-600 font-medium'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {item.text}
        </a>
      ))}
    </nav>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ArticleClient({
  article,
  groups,
  cta,
  prev,
  next,
}: {
  article: DocArticle
  groups: ArticleGroup[]
  cta?: React.ReactNode
  prev?: { id: string; name: string } | null
  next?: { id: string; name: string } | null
}) {
  const contentHtml = injectHeadingIds(article.content)
  const toc = buildToc(article.content)

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left sidebar — category accordion */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                {article.product}
              </p>
              <SidebarAccordion
                groups={groups}
                currentArticleId={article.id}
                currentCategoryId={article.categoryId}
              />
            </div>
          </aside>

          {/* Center — article content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                <Link href="/" className="hover:text-gray-600 transition">Docs</Link>
                <span>/</span>
                <Link href={`/docs/categories/${article.categoryId}`} className="hover:text-gray-600 transition">
                  {article.categoryName}
                </Link>
                <span>/</span>
                <span className="text-gray-600">{article.name}</span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">{article.name}</h1>
              <div className="flex items-center gap-2 mb-8">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{article.product}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{article.categoryName}</span>
              </div>

              <div
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
              <ArticleFeedback articleId={article.id} />

              {(prev || next) && (
                <div className="flex items-stretch gap-4 mt-8 pt-6 border-t border-gray-200">
                  {prev ? (
                    <Link
                      href={`/docs/${prev.id}`}
                      className="flex-1 flex flex-col gap-1 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition group min-w-0"
                    >
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3" /> Previous
                      </span>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition truncate">
                        {prev.name}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {next ? (
                    <Link
                      href={`/docs/${next.id}`}
                      className="flex-1 flex flex-col items-end gap-1 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition group min-w-0 text-right"
                    >
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        Next <ChevronRight className="w-3 h-3" />
                      </span>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition truncate">
                        {next.name}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              )}
            </div>
            {cta}
          </main>

          {/* Right — table of contents */}
          {toc.length > 0 && (
            <aside className="hidden xl:block w-52 flex-shrink-0">
              <div className="sticky top-24">
                <TableOfContents items={toc} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
