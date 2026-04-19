import Link from 'next/link'
import { Swords, Zap, Shield, Trophy } from 'lucide-react'
import { auth } from '@/auth'
import { AuthButtons } from '@/components/auth-buttons'
import { CreateRoomButton } from '@/components/create-room-button'
import { QuickMatchButton } from '@/components/quickmatch-button'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'

export default async function HomePage() {
  const session = await auth()

  return (
    <main className="relative min-h-screen flex flex-col arena-bg">
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/60 backdrop-blur-sm bg-background/40">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <Swords className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Code<span className="text-primary">Arena</span>
          </span>
        </Link>
        <AuthButtons />
      </header>

      <section className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-3xl text-center">
          <Badge variant="primary" className="mb-6 py-1 px-3 text-[11px] animate-pulse-glow">
            <span className="size-1.5 rounded-full bg-primary" />
            Real-time · Local dev build
          </Badge>

          <h1 className="font-display font-bold text-6xl md:text-7xl tracking-tight leading-[1.05] mb-6">
            Code. Fight.{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-secondary to-arena-rose bg-clip-text text-transparent text-glow-cyan">
                Dominate.
              </span>
            </span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-10">
            Real-time multiplayer DSA battles. Solve problems fast, sabotage your opponents with
            weapons, be the last coder standing.
          </p>

          <div className="flex flex-col items-center gap-3 mb-16">
            {session?.user ? (
              <>
                <QuickMatchButton />
                <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wider">
                  <span className="h-px w-8 bg-border" />
                  or
                  <span className="h-px w-8 bg-border" />
                </div>
                <CreateRoomButton />
              </>
            ) : (
              <Link
                href="/signin"
                className={buttonVariants({ variant: 'primary', size: 'xl' })}
              >
                <Swords />
                Sign in to play
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            <FeatureChip
              icon={<Zap className="text-primary" />}
              title="Battle royale"
              body="Up to 10 coders drop into the same problem."
            />
            <FeatureChip
              icon={<Shield className="text-secondary" />}
              title="8 weapons"
              body="Freeze, mirage, nuke — spend AP to sabotage."
            />
            <FeatureChip
              icon={<Trophy className="text-arena-amber" />}
              title="First to solve"
              body="Pass every test before they do. Simple."
            />
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-4 text-center text-xs text-muted-foreground/60 border-t border-border/40">
        v0.1 · scaffold
      </footer>
    </main>
  )
}

function FeatureChip({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="group rounded-lg border border-border/80 bg-card/40 backdrop-blur-sm p-4 text-left hover:border-primary/40 hover:bg-card/70 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="[&>svg]:size-4">{icon}</div>
        <div className="font-display font-semibold text-sm">{title}</div>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
    </div>
  )
}
