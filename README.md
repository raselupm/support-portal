# Support Portal

A full-featured customer support platform with ticket management, real-time live chat, and a public knowledge base. Built with Next.js 15, Upstash Redis, and Pusher.

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
  - Auto-growing textarea (up to 200 px) with paragraph support (Shift+Enter)
  - Paper-plane send icon with opacity feedback (0.6 → 1 when text is typed)
  - Visitor messages shown with a blue background bubble

### Chat Widget — Home Tab
- **Tabbed interface** — Home tab (house icon) and Ask tab (chat icon) at the bottom of the widget
- **Blue hero section** — greeting heading and subtext at the top of the Home tab
- **Article search** — search bar straddling the hero/content boundary; filters articles live
- **Article grid** — latest 10 docs articles shown as cards with title, 2-line preview, and arrow
- **Inline article reader** — opens articles inside the widget without leaving the page
  - Back button in header, tab bar hidden while reading
  - Maximize / restore toggle to expand the widget (up to 90 vw × 80 vh)
  - Article feedback section (happy / neutral / sad face icons) with cookie-based vote tracking
- **Product filtering** — `data-product` attribute limits articles and search to a specific product
- **Custom accent colour** — `data-color` attribute overrides all blue elements (hover, shadows, and feedback button shades auto-computed via HSL)
- **Open a Support Ticket** button in the Ask tab empty state

### Documentation
- **Public knowledge base** — browsable at `/` (homepage), no login required
- **Category pages** — articles grouped by category with article counts
- **Single article page** — full article with left sidebar (category accordion), right-side table of contents (auto-highlights active section), and breadcrumb navigation
- **Article feedback** — "How did you feel?" section with happy / neutral / sad SVG face icons
  - Blue background container with white text; dark-blue circular buttons
  - Cookie-based voting (1-year cookie); users can switch or remove their reaction at any time
  - Feedback counts (happy / neutral / sad) shown in the admin docs list only — not visible to visitors
- **Search** — popup with live filtering by keyword and category filter dropdown
- **Smart header** — shows logged-in user's name linked to `/profile`, sign out button, and context-aware button ("My Tickets" if logged in, "Open a Ticket" if not); Admin/Staff Panel link shown for staff
- **CTA block** — "Didn't find what you're looking for?" call-to-action at the bottom of the homepage, category pages, and article pages
- **Admin doc management** — create, edit, and delete articles and categories from the admin panel (`/admin/docs`)
- **Chat widget included** — embedded on all public docs pages so visitors can start a chat without logging in

### Rich Text Editor (Tiptap)
- **Headings** — H1, H2, H3 toolbar buttons
- **Image upload** — insert images from a media library (requires storage driver env var)
  - Resizable images — drag any of the 4 corner handles to resize width; height stays `auto`
  - Image captions — click a selected image to type a caption; saved as `<figcaption>` in HTML
- **Paragraph support** in the admin chat reply window (Shift+Enter for newlines)

### Media Library
- **Storage driver support** — set `STORAGE_DRIVER=aws`, `digital-ocean`, or `cloudinary`
- **Image picker modal** — grid view of uploaded images; click to select, then insert into editor
- **Upload** — click the Upload button or drag & drop images onto the modal
- **Delete** — hover an image to reveal a trash icon; confirm deletion inline
- **Single-select** — one image selected at a time for insertion

### Admin Panel
- **Dashboard** — overview of tickets and activity
- **Ticket management** — view all tickets, reply, update status, delete
- **Live chat management** — view all chats (waiting, active, closed), join conversations, close chats
  - Send button inside the input border; auto-growing textarea with paragraph support
- **Staff management** — create and manage support staff accounts (admin only)
- **Docs management** — create and edit knowledge base articles with rich text editor, assign to categories; manage categories
  - Feedback counts column in the articles list showing happy / neutral / sad reaction totals
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
- **New ticket** — staff and admin receive an email when a customer submits a ticket
- **Ticket reply** — delayed notification email sent 2 minutes after a reply if the recipient has not opened the ticket in that window
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
- **Navigation progress bar** — blue NProgress bar on all internal link navigations (globally)
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
| Media storage | AWS S3 / DigitalOcean Spaces / Cloudinary (optional) |
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

# Media storage (optional) — enables image upload in the rich text editor
# Uncomment one block below:

# AWS S3
# STORAGE_DRIVER=aws
# NEXT_PUBLIC_STORAGE_DRIVER=aws
# AWS_ACCESS_KEY_ID=your-key-id
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_REGION=us-east-1
# AWS_BUCKET=your-bucket-name

# DigitalOcean Spaces
# STORAGE_DRIVER=digital-ocean
# NEXT_PUBLIC_STORAGE_DRIVER=digital-ocean
# DO_SPACES_KEY=your-spaces-key
# DO_SPACES_SECRET=your-spaces-secret
# DO_SPACES_REGION=nyc3
# DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
# DO_SPACES_BUCKET=your-space-name

# Cloudinary
# STORAGE_DRIVER=cloudinary
# NEXT_PUBLIC_STORAGE_DRIVER=cloudinary
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret
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
  src="https://your-domain.com/chat-widget.js"
  data-portal-url="https://your-domain.com"
  async
></script>
```

#### Widget Options

| Attribute | Description | Example |
|---|---|---|
| `data-portal-url` | URL of your support portal (required) | `https://support.example.com` |
| `data-color` | Accent colour for the widget (optional) | `#ed339d` |
| `data-product` | Filter the Home tab docs to a specific product (optional) | `Product A` |

The widget appears as a chat bubble in the bottom-right corner. When `data-color` is set, all blue elements (header, hero, buttons, shadows) are replaced with the custom colour and auto-computed hover/active shades.

---

## Project Structure

```
app/
├── (auth)/          # Login & OTP verify pages
├── (portal)/        # Customer-facing portal (tickets, profile)
├── (admin)/         # Admin/staff panel (dashboard, chats, staff, docs)
├── (docs)/          # Public knowledge base (homepage, category, article pages)
│   ├── docs-header.tsx   # Shared header component (session-aware, used across all docs + portal)
│   ├── docs-cta.tsx      # Shared "Didn't find what you're looking for?" CTA block
│   └── docs/        # Article and category archive pages
├── api/             # API routes
│   ├── auth/        # OTP send/verify, Google OAuth
│   ├── tickets/     # Ticket CRUD + comments + seen tracking
│   ├── chat/        # Chat start/send/join/close/typing/seen
│   ├── docs/        # Public docs endpoints (articles, search, single article, feedback)
│   ├── admin/       # Admin-only actions (docs CRUD, media upload/list/delete)
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
├── storage.ts       # Media storage abstraction (AWS S3 / DO Spaces / Cloudinary)
└── types.ts         # Shared TypeScript types
components/
├── tiptap-editor.tsx       # Rich text editor with heading + image toolbar
├── resizable-image.tsx     # Custom Tiptap image extension (resizable, captioned)
├── image-picker-modal.tsx  # Media library modal (upload, select, delete)
├── article-feedback.tsx    # Feedback face-icon component (visitor-facing)
├── chat-widget-script.tsx  # Centralised chat widget <Script> tag (colour, product)
└── navigation-progress.tsx # NProgress bar wired to Next.js route changes
```

---

## License

MIT
