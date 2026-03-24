import Script from 'next/script'

const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ── Chat widget configuration ──────────────────────────────────────────────
const WIDGET_COLOR   = '#165dfc'   // data-color  — primary accent colour
const WIDGET_PRODUCT = ''          // data-product — filter docs by product (leave empty for all)
// ──────────────────────────────────────────────────────────────────────────

interface ChatWidgetScriptProps {
  strategy?: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive'
}

export default function ChatWidgetScript({ strategy = 'afterInteractive' }: ChatWidgetScriptProps) {
  return (
    <Script
      src={`${portalUrl}/chat-widget.js`}
      data-portal-url={portalUrl}
      data-color={WIDGET_COLOR || undefined}
      data-product={WIDGET_PRODUCT || undefined}
      strategy={strategy}
    />
  )
}
