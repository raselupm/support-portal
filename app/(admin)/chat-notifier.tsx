'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Pusher from 'pusher-js'
import { MessageSquare, X } from 'lucide-react'
import { Chat } from '@/lib/types'

function playNewChatSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    // Ascending 3-note chime: C5 → E5 → G5
    const notes = [523, 659, 784]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.18
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.38, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.start(t)
      osc.stop(t + 0.45)
    })
  } catch { /* autoplay policy */ }
}

interface ToastItem {
  id: string
  visitorName: string
  visitorEmail: string
}

export default function ChatNotifier() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe('chats')

    channel.bind('new-chat', (data: { chat: Chat }) => {
      playNewChatSound()
      const item: ToastItem = {
        id: data.chat.id,
        visitorName: data.chat.visitorName || '',
        visitorEmail: data.chat.visitorEmail,
      }
      setToasts((prev) => [...prev, item])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== item.id)), 6000)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('chats')
      pusher.disconnect()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 flex flex-col gap-2 z-50 pointer-events-none w-[calc(100vw-2rem)] sm:w-72">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 bg-white border border-gray-200 rounded-xl shadow-xl p-4"
          style={{ animation: 'sp-slide-up 0.25s ease-out' }}
        >
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">New Chat Request</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {toast.visitorName || toast.visitorEmail}
            </p>
            <Link
              href={`/admin/chats/${toast.id}`}
              className="text-xs text-blue-600 hover:underline mt-1 inline-block font-medium"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              Open chat →
            </Link>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
