'use client'

import { useOnlineStatus } from './online-status-context'

export default function OnlineStatusToggle() {
  const { isOnline, toggle } = useOnlineStatus()

  return (
    <button
      onClick={toggle}
      title={isOnline ? 'You are online — click to go offline' : 'You are offline — click to go online'}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          isOnline ? 'bg-green-500' : 'bg-yellow-400'
        }`}
      />
      <span className="text-xs font-medium text-gray-500 hidden sm:inline">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </button>
  )
}
