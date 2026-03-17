export interface User {
  email: string
  name?: string
  createdAt: string
  receiveEmailNotifications?: boolean  // users: email on ticket reply (default true)
  receiveNewTicketEmails?: boolean     // admin/staff: email on new ticket (default true)
}

export interface Ticket {
  id: string
  userEmail: string
  product: string
  title: string
  description: string // HTML from TipTap
  status: 'open' | 'customer_reply' | 'replied'
  createdAt: string // ISO date
  updatedAt: string // ISO date
}

export interface Comment {
  id: string
  ticketId: string
  authorEmail: string
  content: string // HTML
  isAdmin: boolean
  isSystem?: boolean // server-generated status message
  createdAt: string // ISO date
}

export interface StaffMember {
  email: string
  name: string
  createdAt: string
  createdBy: string
}

export interface Chat {
  id: string
  visitorEmail: string
  visitorName: string
  status: 'waiting' | 'active' | 'closed'
  staffEmail: string | null
  staffName: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMeta {
  currentPage?: string
  ipAddress?: string
  timezone?: string
  browser?: string
  os?: string
  language?: string
}

export interface ChatMessage {
  id: string
  chatId: string
  sender: 'visitor' | 'staff' | 'system'
  senderEmail: string
  senderName: string
  content: string
  createdAt: string
  staffOnly?: boolean
}
