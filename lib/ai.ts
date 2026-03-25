import { redis } from './redis'
import { AiConfig, DocArticle } from './types'

export async function getAiConfig(): Promise<AiConfig | null> {
  return redis.get<AiConfig>('ai_config')
}

async function getDocsContext(): Promise<string> {
  const ids = (await redis.zrange('doc_articles', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return 'No documentation available.'

  const articles = (
    await Promise.all(ids.map((id) => redis.get<DocArticle>(`doc_article:${id}`)))
  ).filter(Boolean) as DocArticle[]

  const text = articles
    .map((a) => {
      const plain = a.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      return `## ${a.name}\nProduct: ${a.product} | Category: ${a.categoryName}\n${plain}`
    })
    .join('\n\n---\n\n')

  return text.length > 20000 ? text.slice(0, 20000) + '\n...[truncated]' : text
}

export const BOT_HANDOFF_MARKER = '__BOT_HANDOFF__'

function buildSystemPrompt(docs: string): string {
  return `You are a helpful customer support bot. You MUST only answer questions using the documentation provided below. If a question cannot be answered from the documentation, respond with exactly this text and nothing else: "${BOT_HANDOFF_MARKER}" — do not add any extra words. Do not make up information. Keep responses concise and friendly.

DOCUMENTATION:
${docs}`
}

export function isBotHandoff(reply: string): boolean {
  return reply.includes(BOT_HANDOFF_MARKER)
}

type Message = { role: 'user' | 'assistant'; content: string }

function defaultModel(provider: AiConfig['provider']): string {
  if (provider === 'anthropic') return 'claude-haiku-4-5-20251001'
  if (provider === 'openai') return 'gpt-4o-mini'
  return 'gemini-1.5-flash'
}

async function callAnthropic(messages: Message[], systemPrompt: string, apiKey: string, model: string): Promise<string | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`Anthropic API error ${res.status}:`, body)
    return null
  }
  const data = await res.json()
  return data.content?.[0]?.text ?? null
}

async function callOpenAI(messages: Message[], systemPrompt: string, apiKey: string, model: string): Promise<string | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`OpenAI API error ${res.status}:`, body)
    return null
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

async function callGemini(messages: Message[], systemPrompt: string, apiKey: string, model: string): Promise<string | null> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`Gemini API error ${res.status}:`, body)
    return null
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

export async function generateBotReply(
  messages: Message[],
  config: AiConfig
): Promise<string | null> {
  try {
    const docs = await getDocsContext()
    const systemPrompt = buildSystemPrompt(docs)
    const model = config.model || defaultModel(config.provider)

    switch (config.provider) {
      case 'anthropic':
        return await callAnthropic(messages, systemPrompt, config.apiKey, model)
      case 'openai':
        return await callOpenAI(messages, systemPrompt, config.apiKey, model)
      case 'gemini':
        return await callGemini(messages, systemPrompt, config.apiKey, model)
      default:
        return null
    }
  } catch (err) {
    console.error('generateBotReply error:', err)
    return null
  }
}
