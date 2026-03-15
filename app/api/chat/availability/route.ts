import { redis } from '@/lib/redis'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

export async function GET() {
  try {
    // Find any live staff heartbeat keys (set by the admin panel, TTL 35s)
    const keys = await redis.keys('staff_heartbeat:*')
    const online = keys.length > 0
    return Response.json({ online, count: keys.length }, { headers: corsHeaders })
  } catch {
    return Response.json({ online: false, count: 0 }, { headers: corsHeaders })
  }
}
