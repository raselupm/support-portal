'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ticket, Menu, X } from 'lucide-react'
import LogoutButton from '@/app/(portal)/logout-button'
import AdminNavLinks from './admin-nav-links'
import OnlineUsers from './online-users'

interface Props {
  children: React.ReactNode
  isAdmin: boolean
  admin: boolean
  displayName: string
  appName: string
  waitingCount: number
  openTicketCount: number
  currentEmail: string
}

export default function AdminShell({
  children,
  isAdmin,
  admin,
  displayName,
  appName,
  waitingCount,
  openTicketCount,
  currentEmail,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sidebarContent = (
    <>
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-900">{appName}</span>
          </div>
          {admin ? (
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Admin Panel
            </span>
          ) : (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Staff Panel
            </span>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <AdminNavLinks
          isAdmin={isAdmin}
          initialWaitingCount={waitingCount}
          initialOpenTicketCount={openTicketCount}
          onNavClick={() => setSidebarOpen(false)}
        />
        <div className="mt-auto">
          <OnlineUsers currentEmail={currentEmail} />
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/profile"
              className="text-sm text-gray-500 hover:text-gray-900 transition hidden sm:block"
            >
              {displayName}
            </Link>
            <LogoutButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
