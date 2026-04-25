import { db } from '@code-arena/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Swords, Trophy, Calendar, Flame } from 'lucide-react'
import { auth } from '@/auth'
import { AddFriendButton, type Relationship } from '@/components/add-friend-button'
import { getTopRivals, type Rival } from '@/lib/rivalries'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

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
  const rivals = await getTopRivals(user.id, 5)

  let relationship: Relationship = 'none'
  let friendshipId: string | null = null
  if (session?.user && !isOwn) {
    const f = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, addresseeId: user.id },
          { requesterId: user.id, addresseeId: session.user.id },
        ],
      },
    })
    if (f) {
      friendshipId = f.id
      if (f.status === 'accepted') relationship = 'friends'
      else if (f.status === 'pending') {
        relationship = f.requesterId === session.user.id ? 'outgoing' : 'incoming'
      }
    }
  }

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
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display font-bold text-2xl">{user.username}</h1>
              {session?.user && !isOwn && (
                <AddFriendButton
                  targetUsername={user.username}
                  initialRelationship={relationship}
                  initialFriendshipId={friendshipId}
                />
              )}
            </div>
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
                  <GithubIcon className="size-4" />
                </a>
              )}
              {user.linkedinUrl && (
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LinkedinIcon className="size-4" />
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

        {rivals.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="size-4 text-arena-amber" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {isOwn ? 'Your Rivals' : 'Top Rivals'}
              </h2>
            </div>
            <ul className="space-y-2">
              {rivals.map((r) => (
                <RivalRow key={r.userId} rival={r} ownerIsSubject={true} />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

function RivalRow({
  rival,
  ownerIsSubject: _ownerIsSubject,
}: {
  rival: Rival
  ownerIsSubject: boolean
}) {
  const dominant = rival.wins > rival.losses
  const even = rival.wins === rival.losses
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card/40 px-4 py-3">
      <Link
        href={`/u/${rival.username}`}
        className="flex items-center gap-3 min-w-0 hover:text-primary transition-colors"
      >
        {rival.avatarUrl ? (
          <img
            src={rival.avatarUrl}
            alt=""
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <div className="size-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 grid place-items-center text-xs font-bold">
            {rival.username[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{rival.username}</div>
          <div className="text-xs text-muted-foreground">
            {rival.elo} Elo · <span className="capitalize">{rival.rankTier}</span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Record</div>
          <div
            className={`font-mono text-sm font-semibold ${
              even
                ? 'text-muted-foreground'
                : dominant
                  ? 'text-arena-emerald'
                  : 'text-destructive'
            }`}
          >
            {rival.wins}-{rival.losses}
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground tabular-nums w-16">
          {rival.matches} {rival.matches === 1 ? 'match' : 'matches'}
        </div>
      </div>
    </li>
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
