'use client'

import { useState } from 'react'
import { Bot, Trash2, Save, CheckCircle, AlertCircle } from 'lucide-react'

type Provider = 'anthropic' | 'openai' | 'gemini'

interface Config {
  provider: Provider
  model: string
  enabled: boolean
  hasKey: boolean
}

const PROVIDERS: { value: Provider; label: string; placeholder: string; defaultModel: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...', defaultModel: 'claude-haiku-4-5-20251001' },
  { value: 'openai',    label: 'OpenAI (GPT)',       placeholder: 'sk-...',      defaultModel: 'gpt-4o-mini' },
  { value: 'gemini',    label: 'Google Gemini',       placeholder: 'AIza...',     defaultModel: 'gemini-1.5-flash' },
]

export default function AiSettingsClient({ initial }: { initial: Config | null }) {
  const [provider, setProvider] = useState<Provider>(initial?.provider ?? 'anthropic')
  const [apiKey, setApiKey]     = useState(initial?.hasKey ? '••••••••' : '')
  const [model, setModel]       = useState(initial?.model ?? '')
  const [enabled, setEnabled]   = useState(initial?.enabled ?? true)
  const [saving, setSaving]     = useState(false)
  const [removing, setRemoving] = useState(false)
  const [status, setStatus]     = useState<'idle' | 'saved' | 'removed' | 'error'>('idle')
  const [hasConfig, setHasConfig] = useState(!!initial)

  const currentProvider = PROVIDERS.find((p) => p.value === provider)!

  async function handleSave() {
    if (!apiKey || apiKey === '••••••••' && !initial?.hasKey) return
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model: model || undefined, enabled }),
      })
      if (res.ok) {
        setStatus('saved')
        setHasConfig(true)
        if (apiKey !== '••••••••') setApiKey('••••••••')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/admin/ai', { method: 'DELETE' })
      if (res.ok) {
        setHasConfig(false)
        setApiKey('')
        setModel('')
        setEnabled(true)
        setProvider('anthropic')
        setStatus('removed')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">AI Chat Bot</p>
            <p className="text-xs text-gray-500">Automatically answers from your documentation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasConfig && (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              {enabled ? 'Active' : 'Disabled'}
            </span>
          )}
        </div>
      </div>

      {/* Status feedback */}
      {status === 'saved' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          AI bot configured and active. It will now handle new chats automatically.
        </div>
      )}
      {status === 'removed' && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          AI bot configuration removed.
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Something went wrong. Please try again.
        </div>
      )}

      {/* Provider */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-700">AI Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as Provider)
            setModel('')
            if (apiKey === '••••••••') setApiKey('')
          }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-700">API Key</label>
        <input
          type="password"
          value={apiKey}
          onFocus={() => { if (apiKey === '••••••••') setApiKey('') }}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={currentProvider.placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400">Stored securely. Never exposed to clients.</p>
      </div>

      {/* Model override */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-700">
          Model <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={`Default: ${currentProvider.defaultModel}`}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between py-2 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-900">Enable AI bot</p>
          <p className="text-xs text-gray-500">Bot will handle new chats and can be taken over by staff</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !apiKey}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {hasConfig && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            {removing ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 space-y-1.5">
        <p className="font-semibold text-blue-800">How it works</p>
        <ul className="space-y-1 list-disc list-inside text-blue-700">
          <li>When enabled, the live chat shows as always online</li>
          <li>Bot joins new chats automatically and answers from your docs</li>
          <li>Staff can take over any bot-handled chat at any time</li>
          <li>Bot only uses content from your documentation — nothing else</li>
        </ul>
      </div>
    </div>
  )
}
