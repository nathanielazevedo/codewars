import './globals.css'
import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { cn } from '@/lib/cn'
import { auth } from '@/auth'
import { PresenceProvider } from '@/components/presence-provider'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700'],
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Code Arena',
  description: 'Real-time multiplayer DSA battle',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en" className={cn(sans.variable, display.variable, mono.variable)}>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen">
        <PresenceProvider currentUserId={session?.user?.id ?? null}>
          {children}
        </PresenceProvider>
      </body>
    </html>
  )
}
