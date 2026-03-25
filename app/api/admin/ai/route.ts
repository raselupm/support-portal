import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { AiConfig } from '@/lib/types'

async function checkAdmin(): Promise<boolean> {
  const session = await getSession()
  return !!session.email && isAdmin(session.email)
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await redis.get<AiConfig>('ai_config')
  if (!config) return NextResponse.json(null)

  return NextResponse.json({
    provider: config.provider,
    model: config.model ?? '',
    enabled: config.enabled,
    hasKey: !!config.apiKey,
  })
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider, apiKey, model, enabled } = await request.json()

  if (!['anthropic', 'openai', 'gemini'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 })
  }
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return NextResponse.json({ error: 'API key is required.' }, { status: 400 })
  }

  // If a key already exists and the submitted key is masked, keep the existing one
  const existing = await redis.get<AiConfig>('ai_config')
  const resolvedKey = apiKey.trim() === '••••••••' && existing?.apiKey
    ? existing.apiKey
    : apiKey.trim()

  const config: AiConfig = {
    provider,
    apiKey: resolvedKey,
    model: typeof model === 'string' && model.trim() ? model.trim() : undefined,
    enabled: enabled !== false,
  }

  await redis.set('ai_config', JSON.stringify(config))

  return NextResponse.json({ provider: config.provider, model: config.model ?? '', enabled: config.enabled, hasKey: true })
}

export async function DELETE() {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await redis.del('ai_config')
  return NextResponse.json({ success: true })
}
