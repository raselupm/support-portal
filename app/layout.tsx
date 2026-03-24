import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import Footer from '@/components/footer'
import NavigationProgressWrapper from '@/components/navigation-progress-wrapper'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

export const metadata: Metadata = {
  title: appName,
  description: 'Customer support tickets and live chat',
  applicationName: appName,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: appName,
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900 flex flex-col min-h-screen`}>
        <NavigationProgressWrapper />
        <style>{`#nprogress .bar { background: #2563eb; height: 3px; } #nprogress .peg { box-shadow: 0 0 10px #2563eb, 0 0 5px #2563eb; }`}</style>
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Footer />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function (err) {
                  console.error('SW registration failed:', err)
                })
              })
            }
          `}
        </Script>
      </body>
    </html>
  )
}
