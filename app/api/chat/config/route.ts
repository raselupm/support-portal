// Public Pusher config — safe to expose (key/cluster only, no secret)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

export async function GET() {
  return Response.json(
    {
      key: process.env.PUSHER_KEY,
      cluster: process.env.PUSHER_CLUSTER,
    },
    { headers: corsHeaders }
  )
}
