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
export const TICKETS_CHANNEL = 'tickets'
export const chatChannel = (id: string) => `chat-${id}`
export const ticketChannel = (id: string) => `ticket-${id}`

// Event names
export const EVT_NEW_CHAT = 'new-chat'
export const EVT_CHAT_UPDATED = 'chat-updated'
export const EVT_NEW_MESSAGE = 'new-message'
export const EVT_STATUS_CHANGE = 'status-change'
export const EVT_MESSAGES_SEEN = 'messages-seen'
export const EVT_NEW_TICKET = 'new-ticket'
export const EVT_TICKET_REPLY = 'ticket-reply'
export const EVT_TICKET_COMMENT = 'new-comment'
