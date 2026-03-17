import Script from 'next/script'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin, isStaff } from '@/lib/auth'
import TicketNotifier from '@/app/(admin)/ticket-notifier'
import DocsHeader from '@/app/(docs)/docs-header'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session.email) {
    redirect('/login')
  }

  const admin = isAdmin(session.email)
  const staff = !admin && (await isStaff(session.email))
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <DocsHeader appName={appName} logoHref="/" />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      {(admin || staff) && <TicketNotifier />}
      <Script src={`${portalUrl}/chat-widget.js`} data-portal-url={portalUrl} strategy="afterInteractive" />
    </>
  )
}
