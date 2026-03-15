'use client'

import { useEffect, useState } from 'react'
import Pusher, { PresenceChannel } from 'pusher-js'
import { Circle } from 'lucide-react'

interface OnlineMember {
  id: string
  info: { email: string; name: string }
}

export default function OnlineUsers({ currentEmail }: { currentEmail: string }) {
  const [members, setMembers] = useState<OnlineMember[]>([])

  // ── Heartbeat: tells /api/chat/availability we're online ──
  useEffect(() => {
    const beat = () => fetch('/api/admin/heartbeat', { method: 'POST' })
    beat() // immediate on mount
    const interval = setInterval(beat, 20_000)

    const handleUnload = () =>
      navigator.sendBeacon('/api/admin/heartbeat?_method=DELETE', '')

    // Best-effort cleanup when tab closes
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
      fetch('/api/admin/heartbeat', { method: 'DELETE' })
    }
  }, [])

  // ── Pusher presence channel: live sidebar list ──
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    })

    const channel = pusher.subscribe('presence-admin') as PresenceChannel

    channel.bind('pusher:subscription_succeeded', (data: { members: Record<string, { email: string; name: string }> }) => {
      const list: OnlineMember[] = Object.entries(data.members).map(([id, info]) => ({
        id,
        info,
      }))
      setMembers(list)
    })

    channel.bind('pusher:member_added', (member: { id: string; info: { email: string; name: string } }) => {
      setMembers((prev) => {
        if (prev.find((m) => m.id === member.id)) return prev
        return [...prev, { id: member.id, info: member.info }]
      })
    })

    channel.bind('pusher:member_removed', (member: { id: string }) => {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('presence-admin')
      pusher.disconnect()
    }
  }, [])

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Online Now
      </p>
      {members.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No one online</p>
      ) : (
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <Circle
                className="w-2 h-2 fill-green-500 text-green-500 flex-shrink-0"
              />
              <span
                className={`text-xs truncate ${
                  m.id === currentEmail ? 'font-semibold text-gray-700' : 'text-gray-600'
                }`}
                title={m.info.email}
              >
                {m.info.name}
                {m.id === currentEmail && (
                  <span className="ml-1 text-gray-400 font-normal">(you)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
