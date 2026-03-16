'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Send, UserCheck, X, Globe, Monitor, Clock, MapPin, Wifi, Check, CheckCheck } from 'lucide-react'
import Pusher from 'pusher-js'
import { Chat, ChatMessage, ChatMeta } from '@/lib/types'

type DisplayMessage = ChatMessage & { failed?: boolean }

// ── Notification helpers ────────────────────────────────────────────────────

function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    // Snapchat-style: two quick ascending tones (bloop-bloop)
    const playTone = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, startTime + 0.06)
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.45, startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12)
      osc.start(startTime)
      osc.stop(startTime + 0.12)
    }

    playTone(ctx.currentTime, 700)
    playTone(ctx.currentTime + 0.13, 950)
  } catch { /* autoplay policy or unsupported */ }
}

let _blinkInterval: ReturnType<typeof setInterval> | null = null
let _originalTitle = ''

function startTitleBlink() {
  if (_blinkInterval) return
  _originalTitle = document.title
  let show = true
  _blinkInterval = setInterval(() => {
    document.title = show ? '💬 New message!' : _originalTitle
    show = !show
  }, 900)
}

function stopTitleBlink() {
  if (_blinkInterval) { clearInterval(_blinkInterval); _blinkInterval = null }
  if (_originalTitle) document.title = _originalTitle
}

interface Props {
  initialChat: Chat
  initialMessages: ChatMessage[]
  staffEmail: string
  staffName: string
  meta?: ChatMeta
  initialVisitorSeenAt?: string
  initialStaffSeenAt?: string
}

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

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 mt-0.5 text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xs text-gray-700 mt-0.5 break-all">{value}</p>
      </div>
    </div>
  )
}

export default function StaffChatWindow({
  initialChat,
  initialMessages,
  staffEmail,
  staffName,
  meta,
  initialVisitorSeenAt,
  initialStaffSeenAt,
}: Props) {
  const [chat, setChat] = useState<Chat>(initialChat)
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [joining, setJoining] = useState(false)
  const [closing, setClosing] = useState(false)
  const [visitorTyping, setVisitorTyping] = useState<string | null>(null)
  const [visitorSeenAt, setVisitorSeenAt] = useState<string | undefined>(initialVisitorSeenAt)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSentRef = useRef<number>(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const markSeen = useCallback(() => {
    fetch(`/api/chat/${initialChat.id}/seen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  }, [initialChat.id])

  useEffect(() => {
    markSeen()
    const onFocus = () => { stopTitleBlink(); markSeen() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [markSeen])

  // Real-time via Pusher
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(`chat-${initialChat.id}`)

    channel.bind('new-message', (msg: DisplayMessage) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (msg.sender !== 'staff') {
        if (document.hasFocus()) {
          markSeen()
        } else {
          playNotificationSound()
          startTitleBlink()
        }
      }
    })

    channel.bind('status-change', (data: { status: Chat['status']; staffEmail?: string; staffName?: string }) => {
      setChat((prev) => ({
        ...prev,
        status: data.status,
        staffEmail: data.staffEmail ?? prev.staffEmail,
        staffName: data.staffName ?? prev.staffName,
      }))
    })

    channel.bind('messages-seen', (data: { seenBy: 'visitor' | 'staff'; seenAt: string }) => {
      if (data.seenBy === 'visitor') setVisitorSeenAt(data.seenAt)
    })

    channel.bind('typing', (data: { name: string; sender: 'visitor' | 'staff' }) => {
      if (data.sender !== 'visitor') return
      setVisitorTyping(data.name)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setVisitorTyping(null), 3000)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`chat-${initialChat.id}`)
      pusher.disconnect()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [initialChat.id])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const res = await fetch(`/api/chat/${chat.id}/join`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setChat(data.chat)
      }
    } finally {
      setJoining(false)
    }
  }

  const handleClose = async () => {
    setClosing(true)
    try {
      const res = await fetch(`/api/chat/${chat.id}/close`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setChat(data.chat)
      }
    } finally {
      setClosing(false)
    }
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending || chat.status !== 'active') return

    setSending(true)
    setInput('')

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimistic: DisplayMessage = {
      id: tempId,
      chatId: chat.id,
      sender: 'staff',
      senderEmail: staffEmail,
      senderName: staffName,
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch(`/api/chat/${chat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.message.id)) {
            return prev.filter((m) => m.id !== tempId)
          }
          return prev.map((m) => (m.id === tempId ? data.message : m))
        })
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
      )
    } finally {
      setSending(false)
    }
  }

  const sendTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    fetch(`/api/chat/${chat.id}/typing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
  }, [chat.id])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const displayName = chat.visitorName || chat.visitorEmail

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)] max-h-[800px]">

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/chats"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{displayName}</span>
                <StatusBadge status={chat.status} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {chat.visitorEmail}
                {' · '}
                Started {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                {chat.staffName && ` · Assigned to ${chat.staffName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {chat.status === 'waiting' && (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {joining ? 'Joining...' : 'Join Chat'}
              </button>
            )}
            {chat.status === 'active' && (
              <button
                onClick={handleClose}
                disabled={closing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
              >
                <X className="w-3.5 h-3.5" />
                {closing ? 'Closing...' : 'Close Chat'}
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 bg-white border border-gray-200 border-t-0 border-b-0 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">No messages yet.</div>
          )}
          {messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                    {msg.content}
                  </span>
                </div>
              )
            }
            const isStaffMsg = msg.sender === 'staff'
            const isSending = msg.id.startsWith('temp-')
            const isSeen = isStaffMsg && !isSending && !!visitorSeenAt && msg.createdAt <= visitorSeenAt
            const isDelivered = isStaffMsg && !isSending
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isStaffMsg ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-medium">{msg.senderName}</span>
                  <span>·</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isStaffMsg && !isSending && (
                    isSeen
                      ? <CheckCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      : isDelivered
                      ? <Check className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      : null
                  )}
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm max-w-[75%] ${
                    msg.failed
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : isStaffMsg
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  } ${msg.id.startsWith('temp-') ? 'opacity-60' : ''}`}
                >
                  {msg.content}
                </div>
                {msg.failed && (
                  <span className="text-xs text-red-500">Not delivered</span>
                )}
              </div>
            )
          })}

          {chat.status === 'closed' && (
            <div className="flex justify-center py-4">
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                Chat closed
              </span>
            </div>
          )}

          {visitorTyping && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-2xl rounded-tl-sm">
                <span className="text-xs text-gray-500">{visitorTyping} is typing</span>
                <span className="flex gap-0.5 items-center">
                  <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 px-4 py-3 flex-shrink-0">
          {chat.status === 'waiting' && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-sm text-amber-700">
                Join this chat to start responding to the visitor.
              </span>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="ml-auto flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {joining ? 'Joining...' : 'Join Chat'}
              </button>
            </div>
          )}

          {chat.status === 'closed' && (
            <div className="text-center text-sm text-gray-400 py-1">
              This chat has been closed.
            </div>
          )}

          {chat.status === 'active' && (
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); sendTyping() }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Enter to send)"
                rows={2}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="self-end flex-shrink-0 p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Visitor info sidebar ──────────────────────────────────────── */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        {/* Identity */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Visitor</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{chat.visitorName || '—'}</p>
              <p className="text-xs text-gray-500 truncate">{chat.visitorEmail}</p>
            </div>
          </div>
        </div>

        {/* Session details */}
        {meta && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Session</p>
            <MetaRow
              icon={<Wifi className="w-3.5 h-3.5" />}
              label="IP Address"
              value={meta.ipAddress}
            />
            <MetaRow
              icon={<Globe className="w-3.5 h-3.5" />}
              label="Current Page"
              value={meta.currentPage}
            />
            <MetaRow
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Timezone"
              value={meta.timezone}
            />
            <MetaRow
              icon={<Monitor className="w-3.5 h-3.5" />}
              label="Browser"
              value={meta.browser && meta.os ? `${meta.browser} on ${meta.os}` : (meta.browser || meta.os)}
            />
            <MetaRow
              icon={<MapPin className="w-3.5 h-3.5" />}
              label="Language"
              value={meta.language}
            />
          </div>
        )}

        {/* Chat info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chat</p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</p>
              <div className="mt-1"><StatusBadge status={chat.status} /></div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Started</p>
              <p className="text-xs text-gray-700 mt-0.5">
                {new Date(chat.createdAt).toLocaleString([], {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            {chat.staffName && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Assigned to</p>
                <p className="text-xs text-gray-700 mt-0.5">{chat.staffName}</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
