'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, Search, X, FileText, ChevronRight } from 'lucide-react'
import { DocArticle, DocCategory } from '@/lib/types'

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

// ── Search Popup ────────────────────────────────────────────────────────────
function SearchPopup({
  articles,
  categories,
  onClose,
}: {
  articles: DocArticle[]
  categories: DocCategory[]
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = articles.filter((a) => {
    const matchesCategory = !selectedCategory || a.categoryId === selectedCategory
    if (!query.trim()) return matchesCategory
    const q = query.toLowerCase()
    return matchesCategory && (
      a.name.toLowerCase().includes(q) ||
      stripHtml(a.content).toLowerCase().includes(q)
    )
  }).slice(0, 10)

  const displayArticles = query.trim() || selectedCategory ? filtered : articles.slice(0, 5)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search row */}
        <div className="flex gap-3 p-4 border-b border-gray-100">
          <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation…"
              className="flex-1 bg-transparent text-gray-900 text-sm focus:outline-none placeholder-gray-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {displayArticles.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No articles found.</div>
          ) : (
            <ul>
              {displayArticles.map((article, i) => (
                <li key={article.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                  <Link
                    href={`/docs/${article.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50/60 transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 truncate">
                        {article.name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{article.categoryName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!query && !selectedCategory && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {displayArticles.length} most recent articles
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hero canvas (floating connected particles) ───────────────────────────────
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 60
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function DocsHomeClient({
  articles,
  categories,
  appName,
  cta,
}: {
  articles: DocArticle[]
  categories: DocCategory[]
  appName: string
  cta?: React.ReactNode
}) {
  const [searchOpen, setSearchOpen] = useState(false)

  // Build category boxes: for each category, get article count + 5 oldest articles
  const categoryBoxes = categories.map((cat) => {
    const catArticles = articles.filter((a) => a.categoryId === cat.id)
    const oldest = [...catArticles].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ).slice(0, 5)
    return { category: cat, count: catArticles.length, articles: oldest }
  }).filter((box) => box.count > 0)

  return (
    <>
      {searchOpen && (
        <SearchPopup
          articles={articles}
          categories={categories}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700" />

          {/* Canvas particle animation */}
          <HeroCanvas />


          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              Documentation
            </h1>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Browse our guides and articles to get answers fast. Everything you need to know about our products, all in one place.
            </p>

            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-3 w-full max-w-md bg-white/95 hover:bg-white text-gray-500 hover:text-gray-700 rounded-xl px-5 py-3.5 shadow-lg transition text-sm text-left"
            >
              <Search className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="flex-1">Search documentation…</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                Esc
              </kbd>
            </button>
          </div>
        </section>

        {/* Main content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {categoryBoxes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No documentation yet</p>
              <p className="text-sm mt-1">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryBoxes.map(({ category, count, articles: boxArticles }) => (
                <div
                  key={category.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col"
                >
                  {/* Box header */}
                  <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900 text-base">{category.name}</h2>
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                        {count}
                      </span>
                    </div>
                  </div>

                  {/* Article list */}
                  <ul className="flex-1 divide-y divide-gray-100">
                    {boxArticles.map((article) => (
                      <li key={article.id}>
                        <Link
                          href={`/docs/${article.id}`}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50/60 transition-colors group"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                          <span className="text-sm text-gray-700 group-hover:text-blue-700 flex-1 truncate">
                            {article.name}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {/* Explore more */}
                  {count > 5 && (
                    <div className="px-5 py-3 border-t border-gray-100">
                      <Link
                        href={`/docs/categories/${category.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition"
                      >
                        Explore more
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                  {count <= 5 && (
                    <div className="px-5 py-3 border-t border-gray-100">
                      <Link
                        href={`/docs/categories/${category.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition"
                      >
                        View category
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {cta}
        </main>
      </div>
    </>
  )
}
