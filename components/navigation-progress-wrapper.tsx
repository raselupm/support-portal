'use client'

import { Suspense } from 'react'
import NavigationProgress from './navigation-progress'

export default function NavigationProgressWrapper() {
  return (
    <Suspense fallback={null}>
      <NavigationProgress />
    </Suspense>
  )
}
