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
