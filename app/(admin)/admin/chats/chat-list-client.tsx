'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'
import Pusher from 'pusher-js'
import { Chat } from '@/lib/types'

type ChatWithCount = Chat & { messageCount: number }

function StatusBadge({ status }: { status: Chat['status'] }) {
  if (status === 'waiting') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Waiting
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Closed
    </span>
  )
}

export default function ChatListClient({ initialChats, isAdmin }: { initialChats: ChatWithCount[]; isAdmin: boolean }) {
  const [chats, setChats] = useState<ChatWithCount[]>(initialChats)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this chat and all its messages? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/chats/${id}`, { method: 'DELETE' })
      if (res.ok) setChats((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe('chats')

    channel.bind('new-chat', (data: { chat: Chat; messageCount: number }) => {
      setChats((prev) => {
        if (prev.find((c) => c.id === data.chat.id)) return prev
        return [{ ...data.chat, messageCount: data.messageCount }, ...prev]
      })
    })

    channel.bind('chat-updated', (updatedChat: Chat) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === updatedChat.id ? { ...updatedChat, messageCount: c.messageCount } : c
        )
      )
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('chats')
      pusher.disconnect()
    }
  }, [])

  if (chats.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">No chats yet</p>
        <p className="text-sm mt-1">Install the chat widget on your site to start receiving chats.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-gray-100">
        {chats.map((chat) => (
          <div key={chat.id} className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900 text-sm">{chat.visitorName || chat.visitorEmail}</p>
                <StatusBadge status={chat.status} />
              </div>
              {chat.visitorName && (
                <p className="text-xs text-gray-500">{chat.visitorEmail}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{chat.messageCount} msg{chat.messageCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}</span>
                {chat.staffName && (
                  <>
                    <span>·</span>
                    <span>{chat.staffName}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/admin/chats/${chat.id}`}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chat.status === 'closed'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {chat.status === 'closed' ? 'View' : 'Join'}
              </Link>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(chat.id)}
                  disabled={deleting === chat.id}
                  className="inline-flex items-center p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Visitor</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Messages</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Started</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Staff</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {chats.map((chat) => (
            <tr key={chat.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{chat.visitorName || chat.visitorEmail}</p>
                {chat.visitorName && <p className="text-xs text-gray-500">{chat.visitorEmail}</p>}
              </td>
              <td className="px-4 py-3"><StatusBadge status={chat.status} /></td>
              <td className="px-4 py-3 text-gray-600">{chat.messageCount}</td>
              <td className="px-4 py-3 text-gray-500">
                {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {chat.staffName || <span className="text-gray-400 italic">Unassigned</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/chats/${chat.id}`}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      chat.status === 'closed'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    View
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(chat.id)}
                      disabled={deleting === chat.id}
                      className="inline-flex items-center p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
