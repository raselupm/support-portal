import ChatWidgetScript from '@/components/chat-widget-script'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatWidgetScript />
    </>
  )
}
