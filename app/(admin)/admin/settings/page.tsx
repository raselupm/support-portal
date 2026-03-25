import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isAdmin } from '@/lib/auth'
import { getAiConfig } from '@/lib/ai'
import AiSettingsClient from './ai-settings-client'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session.email || !isAdmin(session.email)) redirect('/admin/dashboard')

  const config = await getAiConfig()
  const initial = config
    ? { provider: config.provider, model: config.model ?? '', enabled: config.enabled, hasKey: !!config.apiKey }
    : null

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure AI assistant for live chat</p>
      </div>
      <AiSettingsClient initial={initial} />
    </div>
  )
}
