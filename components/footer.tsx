import Link from 'next/link'
import { Heart, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400">
          <span>Support system developed with</span>
          <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 flex-shrink-0" />
          <span>by</span>
          <span className="text-gray-600 font-medium">Rasel Ahmed</span>
          <span className="text-gray-300 mx-1">·</span>
          <Link
            href="https://github.com/raselupm/support-portal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            Open Source
          </Link>
        </div>
      </div>
    </footer>
  )
}
