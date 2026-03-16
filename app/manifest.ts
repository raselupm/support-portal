import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  return {
    name: appName,
    short_name: appName,
    description: 'Customer support tickets and live chat',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/app-icon-sp.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/app-icon-sp.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/app-icon-sp.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'New Ticket',
        url: '/tickets/new',
        description: 'Submit a new support ticket',
      },
      {
        name: 'My Tickets',
        url: '/tickets',
        description: 'View your support tickets',
      },
    ],
  }
}
