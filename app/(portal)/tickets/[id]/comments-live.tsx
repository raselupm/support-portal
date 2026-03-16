'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import { formatDistanceToNow } from 'date-fns'
import { ShieldCheck, User, Check, CheckCheck } from 'lucide-react'
import { Comment } from '@/lib/types'

interface CommentBubbleProps {
  comment: Comment
  animate: boolean
  nameMap: Record<string, string>
  isMine: boolean
  isSeen: boolean
  seenAt: string | null
}

function CommentBubble({ comment, animate, nameMap, isMine, isSeen, seenAt }: CommentBubbleProps) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 ${
        comment.isAdmin ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
      }`}
      style={animate ? { animation: 'sp-slide-up 0.3s ease-out' } : undefined}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
            comment.isAdmin ? 'bg-green-100' : 'bg-gray-100'
          }`}
        >
          {comment.isAdmin ? (
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <User className="w-3.5 h-3.5 text-gray-500" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-700 truncate">{nameMap[comment.authorEmail] ?? comment.authorEmail}</span>
          {comment.isAdmin && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ring-1 ring-inset ring-green-200 flex-shrink-0">
              Staff
            </span>
          )}
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        {/* Seen/delivered indicator — only on own comments */}
        {isMine && (
          <div className="flex-shrink-0 flex items-center gap-1">
            {isSeen ? (
              <>
                <CheckCheck className="w-4 h-4 text-blue-500" />
                {seenAt && (
                  <span className="text-xs text-blue-400 hidden sm:inline">
                    Seen {formatDistanceToNow(new Date(seenAt), { addSuffix: true })}
                  </span>
                )}
              </>
            ) : (
              <Check className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </div>
      <div
        className="prose prose-sm max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: comment.content }}
      />
    </div>
  )
}

interface Props {
  ticketId: string
  initialComments: Comment[]
  nameMap: Record<string, string>
  currentUserEmail: string
  isCurrentUserStaff: boolean
  initialSeenByCustomerAt: string | null
  initialSeenByStaffAt: string | null
}

export default function CommentsLive({
  ticketId,
  initialComments,
  nameMap,
  currentUserEmail,
  isCurrentUserStaff,
  initialSeenByCustomerAt,
  initialSeenByStaffAt,
}: Props) {
  const [liveComments, setLiveComments] = useState<Comment[]>([])
  const [seenByCustomerAt, setSeenByCustomerAt] = useState<string | null>(initialSeenByCustomerAt)
  const [seenByStaffAt, setSeenByStaffAt] = useState<string | null>(initialSeenByStaffAt)

  // Mark ticket as seen on mount
  useEffect(() => {
    fetch(`/api/tickets/${ticketId}/seen`, { method: 'POST' }).catch(() => {})
  }, [ticketId])

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe(`ticket-${ticketId}`)

    channel.bind('new-comment', (comment: Comment) => {
      setLiveComments((prev) => {
        if (prev.find((c) => c.id === comment.id)) return prev
        return [...prev, comment]
      })
      // Mark as seen immediately when a new comment arrives while viewing
      fetch(`/api/tickets/${ticketId}/seen`, { method: 'POST' }).catch(() => {})
    })

    channel.bind('ticket-seen', (data: { seenBy: 'staff' | 'customer'; seenAt: string }) => {
      if (data.seenBy === 'staff') setSeenByStaffAt(data.seenAt)
      else setSeenByCustomerAt(data.seenAt)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`ticket-${ticketId}`)
      pusher.disconnect()
    }
  }, [ticketId])

  // Dedup live vs server comments
  const initialIds = new Set(initialComments.map((c) => c.id))
  const dedupedLive = liveComments.filter((c) => !initialIds.has(c.id))
  const allComments = [...initialComments, ...dedupedLive]

  // Determine seen state for a comment authored by the current user
  function getSeenInfo(comment: Comment): { isSeen: boolean; seenAt: string | null } {
    if (comment.authorEmail !== currentUserEmail) return { isSeen: false, seenAt: null }
    // If I'm staff, has the customer seen it?
    const relevantSeenAt = isCurrentUserStaff ? seenByCustomerAt : seenByStaffAt
    if (!relevantSeenAt) return { isSeen: false, seenAt: null }
    const seen = new Date(relevantSeenAt) > new Date(comment.createdAt)
    return { isSeen: seen, seenAt: seen ? relevantSeenAt : null }
  }

  if (allComments.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Replies ({allComments.length})
      </h2>
      {allComments.map((comment) => {
        const { isSeen, seenAt } = getSeenInfo(comment)
        return (
          <CommentBubble
            key={comment.id}
            comment={comment}
            animate={!initialIds.has(comment.id)}
            nameMap={nameMap}
            isMine={comment.authorEmail === currentUserEmail}
            isSeen={isSeen}
            seenAt={seenAt}
          />
        )
      })}
    </div>
  )
}
