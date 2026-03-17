import Script from 'next/script'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return (
    <>
      {children}
      <Script src={`${portalUrl}/chat-widget.js`} data-portal-url={portalUrl} strategy="afterInteractive" />
    </>
  )
}
