import type { Metadata } from 'next'
import { IBM_Plex_Mono, Inter, Space_Grotesk } from 'next/font/google'
import { validateEnv } from '@/lib/env-validation'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import './globals.css'

// Validate environment on startup
validateEnv()

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-mono',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'Price Desk — Arogga catalog',
  description: 'Search the Arogga catalog with real B2B price and margin analysis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable}`}>
      <body style={{ fontFamily: "var(--font-inter, Inter, system-ui, sans-serif)" }}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
