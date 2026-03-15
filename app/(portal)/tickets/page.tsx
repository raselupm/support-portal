import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Inbox } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'

async function getTickets(email: string, admin: boolean): Promise<Ticket[]> {
  let ticketIds: string[] = []

  if (admin) {
    const results = await redis.zrange('tickets', 0, -1, { rev: true })
    ticketIds = results as string[]
  } else {
    const results = await redis.zrange(`user_tickets:${email}`, 0, -1, { rev: true })
    ticketIds = results as string[]
  }

  if (ticketIds.length === 0) return []

  const tickets: Ticket[] = []
  for (const id of ticketIds) {
    const ticket = await redis.get<Ticket>(`ticket:${id}`)
    if (ticket) tickets.push(ticket)
  }

  return tickets
}

export default async function TicketsPage() {
  const session = await getSession()
  if (!session.email) redirect('/login')

  const admin = isAdmin(session.email)
  const staff = !admin && (await isStaff(session.email))
  const privileged = admin || staff  // sees all tickets, no create button
  const tickets = await getTickets(session.email, privileged)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {privileged ? 'All Tickets' : 'My Tickets'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        {!privileged && (
          <Link
            href="/tickets/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </Link>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700 mb-1">No tickets yet</h3>
          <p className="text-sm text-gray-400 mb-4">
            {privileged ? 'No tickets have been submitted yet.' : 'Create your first support ticket to get started.'}
          </p>
          {!privileged && (
            <Link
              href="/tickets/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">
                  Title
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3 hidden sm:table-cell">
                  Product
                </th>
                {privileged && (
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3 hidden md:table-cell">
                    Customer
                  </th>
                )}
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3 hidden lg:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm line-clamp-1 block"
                    >
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="text-sm text-gray-500">{ticket.product}</span>
                  </td>
                  {privileged && (
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-500">{ticket.userEmail}</span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
