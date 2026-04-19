import { db } from '@code-arena/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Swords, Github, Linkedin, Trophy, Calendar } from 'lucide-react'
import { auth } from '@/auth'

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const session = await auth()

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      bio: true,
      githubUrl: true,
      linkedinUrl: true,
      elo: true,
      xp: true,
      rankTier: true,
      createdAt: true,
      _count: {
        select: {
          matchPlayers: true,
          submissions: { where: { status: 'accepted' } },
        },
      },
    },
  })

  if (!user) notFound()

  const isOwn = session?.user?.id === user.id

  return (
    <div className="min-h-screen arena-bg">
      <header className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/60 backdrop-blur-sm bg-background/40">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <Swords className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Code<span className="text-primary">Arena</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/leaderboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/friends"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Friends
          </Link>
          {isOwn && (
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit Profile
            </Link>
          )}
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-start gap-6 mb-8">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="size-20 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="size-20 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 grid place-items-center text-2xl font-bold border-2 border-border">
              {user.username[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-display font-bold text-2xl">{user.username}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="capitalize font-medium text-foreground">{user.rankTier}</span>
              <span>·</span>
              <span>{user.elo} Elo</span>
              <span>·</span>
              <span>{user.xp} XP</span>
            </div>
            {user.bio && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{user.bio}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              {user.githubUrl && (
                <a
                  href={user.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="size-4" />
                </a>
              )}
              {user.linkedinUrl && (
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="size-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Trophy className="size-4 text-arena-amber" />}
            label="Matches"
            value={user._count.matchPlayers}
          />
          <StatCard
            icon={<Swords className="size-4 text-primary" />}
            label="Solved"
            value={user._count.submissions}
          />
          <StatCard
            icon={<Calendar className="size-4 text-secondary" />}
            label="Joined"
            value={new Date(user.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          />
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card/40 backdrop-blur-sm p-4 text-center">
      <div className="flex justify-center mb-1.5">{icon}</div>
      <div className="font-display font-bold text-lg">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
