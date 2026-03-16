import nodemailer from 'nodemailer'

const isMailtrap = !!process.env.MAILTRAP_TOKEN

const transporter = isMailtrap
  ? nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    })
  : nodemailer.createTransport({
      host: 'smtp.postmarkapp.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.POSTMARK_SMTP_TOKEN,
        pass: process.env.POSTMARK_SMTP_TOKEN,
      },
    })

export async function sendTicketReplyEmail(
  to: string,
  ticket: { id: string; title: string },
  repliedBy: 'staff' | 'customer',
  replierName: string
): Promise<void> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`

  const isStaffReply = repliedBy === 'staff'
  const intro = isStaffReply
    ? `${replierName} from our support team has replied to your ticket.`
    : `${replierName} has replied to ticket: <strong>${ticket.title}</strong>`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Reply on Your Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background-color:#2563eb;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:600;">New reply on your ticket</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.5;">${intro}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;margin-bottom:24px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Ticket</p>
                    <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">${ticket.title}</p>
                  </td>
                </tr>
              </table>
              <a href="${ticketUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">
                View Reply →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                You received this because you have reply notifications enabled.
                &copy; ${new Date().getFullYear()} ${appName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `New reply on ticket: ${ticket.title}\nFrom: ${replierName}\n\nView: ${ticketUrl}`

  const fromEmail = isMailtrap
    ? (process.env.MAILTRAP_FROM_EMAIL || 'noreply@example.com')
    : process.env.POSTMARK_FROM_EMAIL

  await transporter.sendMail({
    from: `"${appName}" <${fromEmail}>`,
    to,
    subject: `New reply on: ${ticket.title}`,
    text,
    html,
  })
}

export async function sendNewTicketEmail(
  to: string,
  ticket: { id: string; title: string; product: string; userEmail: string; userName: string }
): Promise<void> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  const ticketUrl = `${baseUrl}/admin/tickets/${ticket.id}`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Support Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background-color:#2563eb;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:600;">New support ticket submitted</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.5;">
                A customer has opened a new ticket that needs your attention.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;padding:0;margin-bottom:24px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Title</p>
                    <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">${ticket.title}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Product</p>
                    <p style="margin:0;font-size:14px;color:#111827;">${ticket.product}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">From</p>
                    <p style="margin:0;font-size:14px;color:#111827;">${ticket.userName}</p>
                  </td>
                </tr>
              </table>
              <a href="${ticketUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">
                View Ticket →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                You&apos;re receiving this because you have new ticket notifications enabled.
                &copy; ${new Date().getFullYear()} ${appName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `New ticket: ${ticket.title}\nProduct: ${ticket.product}\nFrom: ${ticket.userName} (${ticket.userEmail})\n\nView: ${ticketUrl}`

  const fromEmail = isMailtrap
    ? (process.env.MAILTRAP_FROM_EMAIL || 'noreply@example.com')
    : process.env.POSTMARK_FROM_EMAIL

  await transporter.sendMail({
    from: `"${appName}" <${fromEmail}>`,
    to,
    subject: `New ticket: ${ticket.title}`,
    text,
    html,
  })
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Support Portal'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Login Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background-color:#2563eb;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:600;">Your login code</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.5;">
                Use the code below to sign in to your account. This code expires in 10 minutes.
              </p>
              <div style="background-color:#f3f4f6;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;font-family:'Courier New',monospace;">${otp}</span>
              </div>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `Your ${appName} login code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, you can safely ignore this email.`

  const fromEmail = isMailtrap
    ? (process.env.MAILTRAP_FROM_EMAIL || 'noreply@example.com')
    : process.env.POSTMARK_FROM_EMAIL

  await transporter.sendMail({
    from: `"${appName}" <${fromEmail}>`,
    to: email,
    subject: `Your login code: ${otp}`,
    text,
    html,
  })
}
