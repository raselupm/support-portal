import Link from 'next/link'
import { Ticket } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function DocsCta() {
  const session = await getSession()

  return (
    <div className="mt-12 bg-blue-600 rounded-xl p-8 text-center">
      <h2 className="text-lg font-semibold text-white mb-2">
        Didn&apos;t find what you&apos;re looking for?
      </h2>
      <p className="text-blue-100 text-sm mb-5">
        Our support team is here to help. Open a ticket and we&apos;ll get back to you.
      </p>
      <Link
        href={session.email ? '/tickets/new' : '/login'}
        className="inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 font-medium text-sm px-5 py-2.5 rounded-lg transition"
      >
        <Ticket className="w-4 h-4" />
        Open a support ticket
      </Link>
    </div>
  )
}
