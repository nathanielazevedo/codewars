import Link from 'next/link'
import { LogOut, Trophy, Zap } from 'lucide-react'
import { auth, signOut } from '@/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export async function AuthButtons() {
  const session = await auth()

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link href="/leaderboard" className="px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors">Leaderboard</Link>
          <Link href="/friends" className="px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors">Friends</Link>
        </nav>
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <Link href="/profile" className="font-display font-semibold text-sm hover:text-primary transition-colors">{session.user.username}</Link>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="primary" className="text-[10px] py-0 px-1.5 h-4">
              <Zap className="size-2.5" />
              {session.user.elo}
            </Badge>
            <Badge variant="amber" className="text-[10px] py-0 px-1.5 h-4">
              <Trophy className="size-2.5" />
              {session.user.rankTier}
            </Badge>
          </div>
        </div>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/' })
          }}
        >
          <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
            <LogOut />
          </Button>
        </form>
      </div>
    )
  }

  return (
    <Link href="/signin" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
      Sign in
    </Link>
  )
}
