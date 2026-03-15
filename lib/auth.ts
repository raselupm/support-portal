export function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS || ''
  const admins = adminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.trim().toLowerCase())
}

export async function isStaff(email: string): Promise<boolean> {
  if (isAdmin(email)) return true
  const { redis } = await import('./redis')
  const staff = await redis.get(`staff:${email.trim().toLowerCase()}`)
  return staff !== null
}
