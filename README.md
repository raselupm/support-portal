# Support Portal

A full-featured customer support platform with ticket management and real-time live chat. Built with Next.js 15, Upstash Redis, and Pusher.

**Live Demo:** [support.rasel.me](https://support.rasel.me)

---

## Features

### Customer Portal
- **Email OTP login** — passwordless authentication via one-time codes
- **Submit support tickets** — rich text editor (Tiptap) with product categorization
- **Track ticket status** — view open, in-progress, and resolved tickets
- **Reply to tickets** — threaded comment system
- **Live chat widget** — embeddable JavaScript widget for any webpage
  - Visitor name + email collection before chat starts
  - Real-time messaging via Pusher
  - Snapchat-style notification sounds
  - Chat history persisted across page reloads

### Admin Panel
- **Dashboard** — overview of tickets and activity
- **Ticket management** — view all tickets, reply, update status, delete
- **Live chat management** — view all chats (waiting, active, closed), join conversations, close chats
- **Staff management** — create and manage support staff accounts (admin only)
- **Real-time notifications** — sound + toast alert when a visitor requests chat
- **Waiting chat badge** — live count on Chats nav link via Pusher

### Staff Panel
- Support staff can access the admin panel (chat + tickets) but cannot manage staff accounts
- System messages when staff joins or ends a chat

### Security
- Google reCAPTCHA v2 on login (optional, configure via env vars)
- Session-based auth with encrypted cookies (iron-session)
- Admin-only actions protected at API level (ticket delete, chat delete, staff management)

### Developer Features
- Embeddable chat widget (`/chat-widget.js`) — drop a single `<script>` tag into any site
- Captures visitor metadata: current URL, IP address, timezone, browser, OS, language
- Navigation progress bar on admin panel
- No database required — runs entirely on Upstash Redis

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Upstash Redis |
| Auth | iron-session (encrypted cookies) |
| Real-time | Pusher (Channels) |
| Email | Nodemailer (SMTP) |
| Rich text | Tiptap |

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Upstash Redis](https://upstash.com) database
- [Pusher](https://pusher.com) Channels app
- SMTP email account (Gmail, Resend, etc.)

### Installation

```bash
git clone https://github.com/your-username/support-portal.git
cd support-portal
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Support Portal

# Session (generate a strong random secret)
SESSION_SECRET=your-32-char-secret-here

# Admin emails (comma-separated)
ADMIN_EMAILS=admin@example.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Email — Postmark (production)
POSTMARK_SMTP_TOKEN=your-postmark-token
POSTMARK_FROM_EMAIL=noreply@yourdomain.com

# Email — Mailtrap (local development, takes priority when set)
# MAILTRAP_TOKEN=any-non-empty-value
# MAILTRAP_USER=your-mailtrap-inbox-user
# MAILTRAP_PASS=your-mailtrap-inbox-pass
# MAILTRAP_FROM_EMAIL=noreply@example.com

# Pusher
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=mt1
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=mt1

# Google reCAPTCHA v2 (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key

# Rate limits — users only, not admin/staff (optional, defaults shown)
# MAX_OPEN_TICKETS_PER_USER=3      # max open tickets a user can have at once
# MAX_WAITING_CHATS_PER_IP=2       # max waiting chats from a single IP address
# MAX_CHAT_MESSAGES_PER_SECOND=3   # max chat messages a visitor can send per second
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### First-time Setup

1. Add your email to `ADMIN_EMAILS` in `.env.local`
2. Go to `/login` and sign in with that email — you'll receive a one-time code
3. You now have full admin access at `/admin`

### Creating Support Staff

1. Go to **Admin Panel → Staff**
2. Click **Add Staff** and enter the staff member's email and name
3. They can log in at `/login` and access the staff panel

### Embedding the Chat Widget

Add this snippet before `</body>` on any webpage:

```html
<script
  src="https://support.rasel.me/chat-widget.js"
  data-portal-url="https://support.rasel.me"
  async
></script>
```

The widget appears as a chat bubble in the bottom-right corner.

---

## Project Structure

```
app/
├── (auth)/          # Login & OTP verify pages
├── (portal)/        # Customer-facing portal (tickets)
├── (admin)/         # Admin/staff panel (dashboard, chats, staff)
├── api/             # API routes
│   ├── auth/        # OTP send/verify
│   ├── tickets/     # Ticket CRUD + comments
│   ├── chat/        # Chat start/send/join/close
│   └── admin/       # Admin-only actions
public/
└── chat-widget.js   # Embeddable chat widget (vanilla JS)
lib/
├── auth.ts          # isAdmin / isStaff helpers
├── session.ts       # iron-session config
├── redis.ts         # Upstash Redis client
├── pusher.ts        # Pusher server client
└── types.ts         # Shared TypeScript types
```

---

## License

MIT
