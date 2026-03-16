'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Pusher from 'pusher-js'
import { TicketIcon, X } from 'lucide-react'

function playNewTicketSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    // Double-bell: two descending tones (B5 → G5) — distinct from ascending chat chime
    const notes = [988, 784]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.22
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + 0.3)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch { /* autoplay policy */ }
}

interface ToastItem {
  id: string       // unique toast key
  ticketId: string // actual ticket ID for the link
  title: string
  userEmail: string
  type: 'new' | 'reply'
}

export default function TicketNotifier() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe('tickets')

    function addToast(data: { id: string; title: string; userEmail: string }, type: 'new' | 'reply') {
      playNewTicketSound()
      const item: ToastItem = { id: `${data.id}-${Date.now()}`, ticketId: data.id, title: data.title, userEmail: data.userEmail, type }
      setToasts((prev) => [...prev, item])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== item.id)), 6000)
    }

    channel.bind('new-ticket', (data: { id: string; title: string; userEmail: string }) => addToast(data, 'new'))
    channel.bind('ticket-reply', (data: { id: string; title: string; userEmail: string }) => addToast(data, 'reply'))

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('tickets')
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
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <TicketIcon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {toast.type === 'reply' ? 'New Reply on Ticket' : 'New Ticket'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{toast.title}</p>
            <p className="text-xs text-gray-400 truncate">{toast.userEmail}</p>
            <Link
              href={`/tickets/${toast.ticketId}`}
              className="text-xs text-amber-600 hover:underline mt-1 inline-block font-medium"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              View ticket →
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
