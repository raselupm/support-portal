import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { Ticket, Comment, User } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import CommentsLive from './comments-live'
import CommentForm from './comment-form'
import DeleteTicketButton from './delete-button'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getNameMap(emails: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(emails)]
  const entries = await Promise.all(
    unique.map(async (email) => {
      const user = await redis.get<User>(`user:${email}`)
      if (user?.name) return [email, user.name] as const
      const staff = await redis.get<User>(`staff:${email}`)
      if (staff?.name) return [email, staff.name] as const
      return [email, email] as const
    })
  )
  return Object.fromEntries(entries)
}

async function getTicketData(id: string) {
  const ticket = await redis.get<Ticket>(`ticket:${id}`)
  if (!ticket) return null

  const rawComments = await redis.lrange(`ticket_comments:${id}`, 0, -1)
  const comments: Comment[] = rawComments
    .map((c) => {
      if (typeof c === 'string') {
        try {
          return JSON.parse(c) as Comment
        } catch {
          return null
        }
      }
      return c as Comment
    })
    .filter((c): c is Comment => c !== null)

  const allEmails = [ticket.userEmail, ...comments.map((c) => c.authorEmail)]
  const [nameMap, seenByCustomerAt, seenByStaffAt] = await Promise.all([
    getNameMap(allEmails),
    redis.get<string>(`ticket_seen_customer:${id}`),
    redis.get<string>(`ticket_seen_staff:${id}`),
  ])

  return { ticket, comments, nameMap, seenByCustomerAt, seenByStaffAt }
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()
  if (!session.email) redirect('/login')

  const data = await getTicketData(id)
  if (!data) notFound()

  const { ticket, comments, nameMap, seenByCustomerAt, seenByStaffAt } = data
  const admin = isAdmin(session.email)
  const staff = await isStaff(session.email)

  // Customers can only see their own tickets
  if (!admin && ticket.userEmail !== session.email) {
    notFound()
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </Link>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{ticket.title}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">{nameMap[ticket.userEmail]}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: ticket.description }}
            />
          </div>

          {/* Comments — live via Pusher */}
          <CommentsLive
            ticketId={ticket.id}
            initialComments={comments}
            nameMap={nameMap}
            currentUserEmail={session.email}
            isCurrentUserStaff={staff}
            initialSeenByCustomerAt={seenByCustomerAt ?? null}
            initialSeenByStaffAt={seenByStaffAt ?? null}
          />

          {/* Comment Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              {comments.length === 0 ? 'Add a Reply' : 'Reply'}
            </h2>
            <CommentForm ticketId={ticket.id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:sticky lg:top-22">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Ticket Information</h2>

            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</dt>
                <dd>
                  <StatusBadge status={ticket.status} />
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Product</dt>
                <dd className="text-sm text-gray-700">{ticket.product}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Created</dt>
                <dd className="text-sm text-gray-700">
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Updated</dt>
                <dd className="text-sm text-gray-700">
                  {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                </dd>
              </div>

              {admin && ticket.userEmail !== session.email && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Customer</dt>
                  <dd className="text-sm text-gray-700">{nameMap[ticket.userEmail]}</dd>
                  {nameMap[ticket.userEmail] !== ticket.userEmail && (
                    <dd className="text-xs text-gray-400 break-all">{ticket.userEmail}</dd>
                  )}
                </div>
              )}

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ticket ID</dt>
                <dd className="text-xs text-gray-400 font-mono">{ticket.id}</dd>
              </div>
            </dl>

            {admin && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <DeleteTicketButton ticketId={ticket.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
