# Support Portal

A full-featured customer support platform with ticket management and real-time live chat. Built with Next.js 15, Upstash Redis, and Pusher.

**Live Demo:** [support.rasel.me](https://support.rasel.me)

---

## Features

### Customer Portal
- **Email OTP login** — passwordless authentication via one-time codes
- **Google OAuth login** — sign in with a Google account (optional, enabled via env vars)
- **Submit support tickets** — rich text editor (Tiptap) with product categorization
  - Minimum character validation: title ≥ 10 chars, description ≥ 20 chars (plain text)
  - Inline amber warning shown before submit; blocked at API level too
- **Name prompt** — users without a display name are prompted to set one on the tickets page
- **Track ticket status** — view open, in-progress, and resolved tickets
- **Reply to tickets** — real-time threaded comments (no page reload via Pusher)
  - Display names shown instead of email addresses (falls back to email if no name set)
  - WhatsApp-style seen indicators: single check (delivered) → double blue check (seen by other side)
  - "Reply emailed X ago" system message appears when a reply notification email is sent
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
- **Real-time notifications** — sound + toast alert when a visitor requests chat or a customer replies to a ticket
- **Waiting chat badge** — live count on Chats nav link via Pusher
- **Header name link** — header shows display name (not email) and links to `/profile`

### Staff Panel
- Support staff can access the admin panel (chat + tickets) but cannot manage staff accounts
- System messages when staff joins or ends a chat

### Profile & Notifications
- **Profile page** (`/profile`) — update display name and notification preferences
- **Email notification settings**:
  - Customers: opt in/out of reply notification emails
  - Staff/Admin: opt in/out of new ticket and reply notification emails
  - Warning popup shown when disabling notifications

### Email Notifications
- **New ticket** — staff and admin receive an email when a customer submits a ticket (respects per-user profile setting `Receive email when a new ticket is submitted`)
- **Ticket reply** — delayed notification email sent 2 minutes after a reply if the recipient has not opened the ticket in that window (respects `receiveEmailNotifications` / `receiveNewTicketEmails` profile setting)
- Email provider: Postmark (production) or Mailtrap (local dev)

### Security
- Google OAuth login (optional) — "Continue with Google" button appears only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set
- Google reCAPTCHA v2 on login (optional, configure via env vars)
- Session-based auth with encrypted cookies (iron-session)
- Admin-only actions protected at API level (ticket delete, chat delete, staff management)
- Rate limiting (customers only, not admin/staff):
  - Max open tickets per user
  - Max waiting chats per IP
  - Max chat messages per second

### PWA (Progressive Web App)
- Installable on any device — browsers prompt "Add to Home Screen"
- Offline support — pages cached after first visit; custom offline fallback shown when network is unavailable
- App manifest with name, theme color, and shortcuts (New Ticket, My Tickets)
- Custom app icon (`app-icon-sp.png`) used as browser favicon, Apple touch icon, and PWA icon
- Service worker strategy: cache-first for static assets, network-first for pages and navigation

### Developer Features
- Embeddable chat widget (`/chat-widget.js`) — drop a single `<script>` tag into any site
- Captures visitor metadata: current URL, IP address, timezone, browser, OS, language
- Navigation progress bar on admin panel
- No database required — runs entirely on Upstash Redis
- Background tasks via `after()` (Next.js 15 native) — Pusher triggers and emails never block the HTTP response
- Self-relaying function pattern for long delays (no Vercel Pro / cron required): each hop sleeps ≤ 50 s then re-invokes itself, staying within the 60 s function limit

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
| Email | Nodemailer + Postmark (prod) / Mailtrap (dev) |
| Rich text | Tiptap |
| Background tasks | `after()` from `next/server` (Next.js 15 native) |
| PWA | Web App Manifest + Service Worker (Workbox-free, hand-rolled) |

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

# Internal API secret — used to secure /api/internal/* endpoints (e.g. delayed email relay)
# Generate with: openssl rand -hex 32
CRON_SECRET=your-secret-here

# Google OAuth (optional) — get credentials at https://console.cloud.google.com
# Add authorized redirect URI: ${NEXT_PUBLIC_APP_URL}/api/auth/google/callback
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

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
├── (portal)/        # Customer-facing portal (tickets, profile)
├── (admin)/         # Admin/staff panel (dashboard, chats, staff)
├── api/             # API routes
│   ├── auth/        # OTP send/verify, Google OAuth
│   ├── tickets/     # Ticket CRUD + comments + seen tracking
│   ├── chat/        # Chat start/send/join/close/typing/seen
│   ├── admin/       # Admin-only actions
│   └── internal/    # Internal endpoints (e.g. delayed email relay)
public/
├── chat-widget.js   # Embeddable chat widget (vanilla JS)
├── sw.js            # Service worker (cache-first + network-first strategies)
└── app-icon-sp.png  # App icon (favicon, Apple touch icon, PWA manifest icon)
lib/
├── auth.ts          # isAdmin / isStaff helpers
├── session.ts       # iron-session config
├── redis.ts         # Upstash Redis client
├── pusher.ts        # Pusher server client + event constants
├── email.ts         # Nodemailer helpers (OTP, new ticket, reply notification)
└── types.ts         # Shared TypeScript types
```

---

## License

MIT
