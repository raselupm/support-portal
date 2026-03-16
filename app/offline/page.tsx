'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M8.111 8.111A3.75 3.75 0 0012 6.75c.98 0 1.874.376 2.542.99m1.347 1.348A3.75 3.75 0 0115.75 12c0 .458-.083.897-.233 1.305M4.5 4.5l15 15M9.75 9.75L6.22 13.28a5.25 5.25 0 007.448 7.448l.584-.584M15 12a3 3 0 00-3-3m6.75 4.5l1.72-1.72a5.25 5.25 0 00-7.448-7.448L12 4.5"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">You&apos;re offline</h1>
        <p className="text-sm text-gray-500 mb-6">
          Check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
