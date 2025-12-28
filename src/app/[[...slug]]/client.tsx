'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { HelmetProvider } from 'react-helmet-async'

const App = dynamic(() => import('../../App'), { ssr: false })

export function ClientOnly() {
  return (
    <HelmetProvider>
      <App />
    </HelmetProvider>
  )
}
