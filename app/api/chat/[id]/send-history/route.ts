import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { Chat, ChatMessage } from '@/lib/types'
import nodemailer from 'nodemailer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

const transporter = nodemailer.createTransport({
  host: 'smtp.postmarkapp.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.POSTMARK_SMTP_TOKEN,
    pass: process.env.POSTMARK_SMTP_TOKEN,
  },
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { email, token } = body

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    const storedChatId = await redis.get(`chat_token:${token}`)
    if (storedChatId !== id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    // One-time guard — NX means only set if key doesn't already exist
    const claimed = await redis.set(`chat_history_sent:${id}`, '1', { nx: true })
    if (!claimed) {
      return NextResponse.json(
        { error: 'Chat history has already been sent for this conversation.' },
        { status: 409, headers: corsHeaders }
      )
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      // Release the claim so they can retry with a valid email
      await redis.del(`chat_history_sent:${id}`)
      return NextResponse.json({ error: 'Email is required.' }, { status: 400, headers: corsHeaders })
    }

    const chat = await redis.get<Chat>(`chat:${id}`)
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404, headers: corsHeaders })
    }

    const rawMessages = (await redis.lrange(`chat_messages:${id}`, 0, -1)) as string[]
    const messages: ChatMessage[] = rawMessages
      .map((r) => { try { return typeof r === 'string' ? JSON.parse(r) : r } catch { return null } })
      .filter(Boolean) as ChatMessage[]

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'
    const startedAt = new Date(chat.createdAt).toLocaleString()

    // Build plain text transcript
    const transcript = messages
      .map((m) => {
        const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const who = m.sender === 'staff' ? (m.senderName || 'Support') : 'You'
        return `[${time}] ${who}: ${m.content}`
      })
      .join('\n')

    // Build HTML transcript
    const htmlRows = messages
      .map((m) => {
        const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const isStaff = m.sender === 'staff'
        const who = isStaff ? (m.senderName || 'Support') : 'You'
        const bgColor = isStaff ? '#f3f4f6' : '#eff6ff'
        const align = isStaff ? 'left' : 'right'
        return `
          <tr>
            <td style="padding:8px 0;">
              <div style="text-align:${align};">
                <div style="display:inline-block;background:${bgColor};border-radius:10px;padding:8px 14px;max-width:75%;text-align:left;">
                  <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">${who} · ${time}</div>
                  <div style="font-size:13px;color:#111827;">${m.content.replace(/</g, '&lt;')}</div>
                </div>
              </div>
            </td>
          </tr>`
      })
      .join('')

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Chat History</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="background:#2563eb;padding:20px 28px;">
            <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">${appName}</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Chat transcript</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 8px;">
            <p style="margin:0;font-size:13px;color:#6b7280;">Started: ${startedAt}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${htmlRows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">&copy; ${new Date().getFullYear()} ${appName}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

    await transporter.sendMail({
      from: `"${appName}" <${process.env.POSTMARK_FROM_EMAIL}>`,
      to: email.trim(),
      subject: `Your chat transcript – ${appName}`,
      text: `Chat transcript\nStarted: ${startedAt}\n\n${transcript}`,
      html,
    })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err) {
    console.error('POST /api/chat/[id]/send-history error:', err)
    // Release the claim so a retry is possible when the email delivery itself failed
    await redis.del(`chat_history_sent:${id}`)
    return NextResponse.json({ error: 'Failed to send history.' }, { status: 500, headers: corsHeaders })
  }
}
