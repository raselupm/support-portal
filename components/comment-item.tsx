import { Comment } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ShieldCheck, User } from 'lucide-react'

interface CommentItemProps {
  comment: Comment
}

export default function CommentItem({ comment }: CommentItemProps) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })

  return (
    <div
      className={`bg-white rounded-xl border p-5 ${
        comment.isAdmin
          ? 'border-green-200 bg-green-50/30'
          : 'border-gray-200'
      }`}
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
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm font-medium text-gray-700 truncate">
            {comment.authorEmail}
          </span>
          {comment.isAdmin && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ring-1 ring-inset ring-green-200 flex-shrink-0">
              Staff
            </span>
          )}
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>
      </div>
      <div
        className="prose prose-sm max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: comment.content }}
      />
    </div>
  )
}
