'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface OnlineStatusContextValue {
  isOnline: boolean
  toggle: () => void
}

const OnlineStatusContext = createContext<OnlineStatusContextValue>({
  isOnline: true,
  toggle: () => {},
})

export function useOnlineStatus() {
  return useContext(OnlineStatusContext)
}

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const bc = new BroadcastChannel('auth')
    bc.onmessage = (e) => {
      if (e.data?.type === 'logout') {
        fetch('/api/admin/heartbeat', { method: 'DELETE' }).catch(() => {})
        router.push('/login')
      }
    }
    return () => bc.close()
  }, [router])

  useEffect(() => {
    if (!isOnline) return

    const beat = () => fetch('/api/admin/heartbeat', { method: 'POST' })
    beat()
    const interval = setInterval(beat, 20_000)

    const handleUnload = () =>
      navigator.sendBeacon('/api/admin/heartbeat?_method=DELETE', '')

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
      fetch('/api/admin/heartbeat', { method: 'DELETE' })
    }
  }, [isOnline])

  function toggle() {
    setIsOnline((prev) => {
      if (prev) {
        // Going offline — send DELETE immediately
        fetch('/api/admin/heartbeat', { method: 'DELETE' })
      }
      return !prev
    })
  }

  return (
    <OnlineStatusContext.Provider value={{ isOnline, toggle }}>
      {children}
    </OnlineStatusContext.Provider>
  )
}
