import { redis } from '@/lib/redis'
import { getAiConfig } from '@/lib/ai'

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
    const [keys, aiConfig] = await Promise.all([
      redis.keys('staff_heartbeat:*'),
      getAiConfig(),
    ])
    const botOnline = !!(aiConfig?.enabled)
    const online = keys.length > 0 || botOnline
    return Response.json({ online, count: keys.length, bot: botOnline }, { headers: corsHeaders })
  } catch {
    return Response.json({ online: false, count: 0, bot: false }, { headers: corsHeaders })
  }
}
