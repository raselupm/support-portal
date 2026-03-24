import ChatWidgetScript from '@/components/chat-widget-script'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatWidgetScript />
    </>
  )
}
