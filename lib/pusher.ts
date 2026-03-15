import PusherServer from 'pusher'

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

// Channel names
export const CHATS_CHANNEL = 'chats'
export const chatChannel = (id: string) => `chat-${id}`

// Event names
export const EVT_NEW_CHAT = 'new-chat'
export const EVT_CHAT_UPDATED = 'chat-updated'
export const EVT_NEW_MESSAGE = 'new-message'
export const EVT_STATUS_CHANGE = 'status-change'
