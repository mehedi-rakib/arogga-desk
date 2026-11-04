'use client'

import { useEffect } from 'react'
import { initDB } from '@/lib/cache'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration)
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
        })
    }

    // Initialize IndexedDB
    initDB()
      .then(() => {
        console.log('✅ IndexedDB initialized')
      })
      .catch((error) => {
        console.warn('IndexedDB initialization failed:', error)
      })
  }, [])

  return null
}
