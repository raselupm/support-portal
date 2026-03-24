'use client'

import { useEffect, useState } from 'react'

type Reaction = 'happy' | 'normal' | 'sad'

const REACTIONS: { key: Reaction; label: string; svg: React.ReactNode }[] = [
  {
    key: 'happy',
    label: 'Happy',
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'normal',
    label: 'Okay',
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="15" x2="16" y2="15" />
        <circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'sad',
    label: 'Sad',
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 17s1.5-2 4-2 4 2 4 2" />
        <circle cx="9" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

export default function ArticleFeedback({ articleId }: { articleId: string }) {
  const [mine, setMine] = useState<Reaction | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/docs/articles/${articleId}/feedback`)
      .then((r) => r.json())
      .then((d) => setMine(d.mine ?? null))
      .catch(() => {})
  }, [articleId])

  async function vote(reaction: Reaction) {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/docs/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      })
      const data = await res.json()
      setMine(data.mine ?? null)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 bg-blue-600 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
      <p className="text-white text-sm font-medium leading-snug">How did you feel?</p>
      <div className="flex items-center gap-2 flex-shrink-0">
        {REACTIONS.map(({ key, label, svg }) => {
          const active = mine === key
          return (
            <button
              key={key}
              onClick={() => vote(key)}
              disabled={loading}
              title={label}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-60
                ${active ? 'bg-blue-950' : 'bg-blue-700 hover:bg-blue-800'}`}
            >
              {svg}
            </button>
          )
        })}
      </div>
    </div>
  )
}
