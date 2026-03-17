'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const COLOR = '#2563eb'

function ProgressBarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevRouteRef = useRef(pathname + searchParams.toString())

  function startProgress() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setVisible(true)
    setProgress(0)
    let p = 0
    intervalRef.current = setInterval(() => {
      // Decelerate as it approaches 85% — never completes on its own
      p += (85 - p) * 0.12
      setProgress(Math.min(p, 85))
    }, 150)
  }

  function completeProgress() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setProgress(100)
    setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 350)
  }

  // Start on any internal link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      // Skip external, hash-only, or same-page links
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return
      if (anchor.target === '_blank') return
      if (href === pathname) return
      startProgress()
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  // Complete when route actually changes
  useEffect(() => {
    const current = pathname + searchParams.toString()
    if (current !== prevRouteRef.current) {
      prevRouteRef.current = current
      completeProgress()
    }
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: '3px', zIndex: 9999, pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: COLOR,
          boxShadow: `0 0 12px ${COLOR}, 0 0 4px ${COLOR}aa`,
          transition: progress === 100
            ? 'width 0.2s ease-out'
            : 'width 0.15s ease',
          borderRadius: '0 3px 3px 0',
        }}
      />
    </div>
  )
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  )
}
