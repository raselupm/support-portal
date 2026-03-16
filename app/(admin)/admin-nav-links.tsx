'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Ticket, MessageSquare } from 'lucide-react'
import Pusher from 'pusher-js'
import { Chat } from '@/lib/types'

export default function AdminNavLinks({
  isAdmin,
  initialWaitingCount,
  initialOpenTicketCount,
}: {
  isAdmin: boolean
  initialWaitingCount: number
  initialOpenTicketCount: number
}) {
  const pathname = usePathname()
  const [waitingCount, setWaitingCount] = useState(initialWaitingCount)
  const [openTicketCount, setOpenTicketCount] = useState(initialOpenTicketCount)

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const chatsChannel = pusher.subscribe('chats')
    const ticketsChannel = pusher.subscribe('tickets')

    chatsChannel.bind('new-chat', (data: { chat: Chat }) => {
      if (data.chat.status === 'waiting') setWaitingCount((n) => n + 1)
    })
    chatsChannel.bind('chat-updated', (chat: Chat) => {
      if (chat.status !== 'waiting') setWaitingCount((n) => Math.max(0, n - 1))
    })

    ticketsChannel.bind('new-ticket', () => setOpenTicketCount((n) => n + 1))
    ticketsChannel.bind('ticket-reply', () => setOpenTicketCount((n) => n + 1))

    return () => {
      chatsChannel.unbind_all()
      ticketsChannel.unbind_all()
      pusher.unsubscribe('chats')
      pusher.unsubscribe('tickets')
      pusher.disconnect()
    }
  }, [])

  const navItems = isAdmin
    ? [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/staff', label: 'Staff', icon: Users },
        { href: '/admin/chats', label: 'Chats', icon: MessageSquare, badge: waitingCount },
      ]
    : [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/chats', label: 'Chats', icon: MessageSquare, badge: waitingCount },
      ]

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map(({ href, label, icon: Icon, badge }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge != null && badge > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold bg-red-500 text-white leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <Link
          href="/tickets"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <Ticket className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">All Tickets</span>
          {openTicketCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold bg-red-500 text-white leading-none">
              {openTicketCount > 99 ? '99+' : openTicketCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  )
}
