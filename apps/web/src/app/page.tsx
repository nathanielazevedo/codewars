import Link from 'next/link'
import { Swords, Zap, Trophy, Medal, Activity, Flame, Crown } from 'lucide-react'
import {
  WEAPONS,
  type WeaponType,
  type ProblemCategory,
  PROBLEM_CATEGORY_LABELS,
} from '@code-arena/types'
import {
  Bomb,
  Eye,
  Lock,
  Radiation,
  Shield,
  Shuffle,
  Snowflake,
  Clock,
} from 'lucide-react'
import { auth } from '@/auth'
import { db } from '@code-arena/db'
import { redis } from '@/lib/redis'
import { AuthButtons } from '@/components/auth-buttons'
import { CreateRoomButton } from '@/components/create-room-button'
import { QuickMatchButton } from '@/components/quickmatch-button'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'

const WEAPON_ICON: Record<WeaponType, React.ComponentType<{ className?: string }>> = {
  freeze: Snowflake,
  screen_lock: Lock,
  shuffle: Shuffle,
  mirage: Eye,
  code_bomb: Bomb,
  shield: Shield,
  time_warp: Clock,
  nuke: Radiation,
}

const WEAPON_LABEL: Record<WeaponType, string> = {
  freeze: 'Freeze',
  screen_lock: 'Lock',
  shuffle: 'Shuffle',
  mirage: 'Mirage',
  code_bomb: 'Bomb',
  shield: 'Shield',
  time_warp: 'Warp',
  nuke: 'Nuke',
}

export default async function HomePage() {
  const session = await auth()

  const [topPlayers, onlineCount, totalMatches, totalProblems, me, featured] = await Promise.all([
    db.user.findMany({
      orderBy: { elo: 'desc' },
      take: 8,
      select: { id: true, username: true, avatarUrl: true, elo: true, rankTier: true },
    }),
    redis.scard('presence:online'),
    db.match.count(),
    db.problem.count(),
    session?.user
      ? db.user.findUnique({
          where: { id: session.user.id },
          select: {
            elo: true,
            xp: true,
            rankTier: true,
            _count: { select: { matchPlayers: true } },
          },
        })
      : Promise.resolve(null),
    db.problem.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { slug: true, title: true, difficulty: true, category: true },
    }),
  ])

  return (
    <main className="relative min-h-screen flex flex-col arena-bg">
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-3 border-b border-border/60 backdrop-blur-sm bg-background/40">
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

      <div className="flex-1 px-4 md:px-8 py-5 max-w-7xl w-full mx-auto lg:h-[calc(100vh-90px)] lg:overflow-hidden">
        <div className="grid grid-cols-1 gap-3 lg:grid-rows-[auto_1fr] lg:h-full">
          {/* TOP ROW: hero + stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* HERO — battle CTA */}
          <section className="lg:col-span-8 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card/80 to-background p-6 md:p-7 flex flex-col">
            <div className="absolute -top-20 -right-20 size-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-20 size-72 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

            <div className="relative flex-1">
              <Badge variant="primary" className="mb-3 py-1 px-3 text-[11px] animate-pulse-glow">
                <span className="size-1.5 rounded-full bg-primary" />
                Live arena
              </Badge>

              <h1 className="font-display font-bold text-3xl md:text-5xl tracking-tight leading-tight mb-3">
                Code. Fight.{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-arena-rose bg-clip-text text-transparent text-glow-cyan">
                  Dominate.
                </span>
              </h1>

              <p className="text-muted-foreground text-sm md:text-base max-w-md mb-5">
                Real-time multiplayer DSA battles. Solve fast, sabotage opponents, be the
                last coder standing.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {session?.user ? (
                  <>
                    <QuickMatchButton />
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
            </div>

            <div className="relative mt-5 pt-4 border-t border-border/40 grid grid-cols-3 gap-3">
              <HeroFeature icon={<Zap className="text-primary" />} title="Solve fast" body="≤10 min sprints" />
              <HeroFeature icon={<Swords className="text-arena-rose" />} title="Sabotage" body="8 weapons, real AP" />
              <HeroFeature icon={<Trophy className="text-arena-amber" />} title="Climb" body="ELO + XP, tiers" />
            </div>
          </section>

          {/* STATS — your stats or sign-in CTA */}
          <section className="lg:col-span-4">
            {me ? (
              <YourStatsCard
                elo={me.elo}
                xp={me.xp}
                rankTier={me.rankTier}
                matchesPlayed={me._count.matchPlayers}
              />
            ) : (
              <SigninTeaserCard />
            )}
          </section>
          </div>

          {/* BOTTOM ROW: leaderboard + right column (fills remaining vh) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:min-h-0">
          {/* LEADERBOARD */}
          <section className="lg:col-span-7 rounded-2xl border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col lg:min-h-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-arena-amber" />
                <h2 className="font-display font-semibold text-sm uppercase tracking-wider">
                  Top Coders
                </h2>
              </div>
              <Link
                href="/leaderboard"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all →
              </Link>
            </div>

            {topPlayers.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                No players yet — be the first.
              </div>
            ) : (
              <ul className="divide-y divide-border/40 overflow-y-auto">
                {topPlayers.map((p, idx) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-card/60 transition-colors"
                  >
                    <div className="w-6 shrink-0 grid place-items-center">
                      <RankBadge rank={idx + 1} />
                    </div>
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatarUrl}
                        alt=""
                        className="size-7 rounded-full object-cover bg-muted/40 border border-border shrink-0"
                      />
                    ) : (
                      <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-border grid place-items-center shrink-0">
                        <span className="text-[11px] font-bold font-display">
                          {p.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <Link
                      href={`/u/${p.username}`}
                      className="flex-1 text-sm font-medium truncate hover:text-primary transition-colors"
                    >
                      {p.username}
                    </Link>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold capitalize ${tierColor(p.rankTier)} hidden sm:inline`}
                    >
                      {p.rankTier}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-sm w-14 text-right">
                      {p.elo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* RIGHT COLUMN — live strip → latest problem → weapons */}
          <section className="lg:col-span-5 grid gap-3 grid-cols-1 content-start lg:overflow-y-auto lg:min-h-0">
            <LiveStatsStrip
              onlineCount={onlineCount}
              totalMatches={totalMatches}
              totalProblems={totalProblems}
            />
            {featured && <FeaturedProblem {...featured} />}
            <WeaponsShowcase />
          </section>
          </div>
        </div>
      </div>

    </main>
  )
}

/* ─── Cards ─── */

function HeroFeature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="[&>svg]:size-4 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="font-display font-semibold text-sm leading-tight">{title}</div>
        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{body}</div>
      </div>
    </div>
  )
}

function YourStatsCard({
  elo,
  xp,
  rankTier,
  matchesPlayed,
}: {
  elo: number
  xp: number
  rankTier: string
  matchesPlayed: number
}) {
  return (
    <div className="relative h-full rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden p-4">
      <div className="absolute -top-12 -right-12 size-32 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="size-4 text-primary" />
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider">
            Your Stats
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="ELO" value={elo} accent="text-primary" />
          <StatTile label="XP" value={xp} accent="text-arena-amber" />
          <StatTile
            label="Tier"
            value={
              <span className={`capitalize ${tierColor(rankTier)}`}>{rankTier}</span>
            }
          />
          <StatTile label="Matches" value={matchesPlayed} />
        </div>
      </div>
    </div>
  )
}

function SigninTeaserCard() {
  return (
    <div className="relative h-full rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5 flex flex-col justify-center text-center">
      <Swords className="size-6 text-primary mx-auto mb-2" />
      <h2 className="font-display font-semibold mb-1">Join the arena</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Sign in to track ELO, climb tiers, and call out friends.
      </p>
      <Link
        href="/signin"
        className={buttonVariants({ variant: 'primary', size: 'sm' })}
      >
        Sign in
      </Link>
    </div>
  )
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: React.ReactNode
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div
        className={`font-display text-xl font-bold tabular-nums ${accent ?? 'text-foreground'}`}
      >
        {value}
      </div>
    </div>
  )
}

function LiveStatsStrip({
  onlineCount,
  totalMatches,
  totalProblems,
}: {
  onlineCount: number
  totalMatches: number
  totalProblems: number
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border/80 bg-card/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 mr-2">
        <Activity className="size-3.5 text-arena-emerald" />
        <span className="size-1.5 rounded-full bg-arena-emerald animate-pulse-glow" />
      </div>
      <InlineStat value={onlineCount} label="online" accent="text-arena-emerald" />
      <span className="text-border">·</span>
      <InlineStat value={totalMatches} label="matches" />
      <span className="text-border">·</span>
      <InlineStat value={totalProblems} label="problems" accent="text-secondary" />
    </div>
  )
}

function InlineStat({
  value,
  label,
  accent,
}: {
  value: number | string
  label: string
  accent?: string
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`font-display font-bold text-lg tabular-nums ${accent ?? 'text-foreground'}`}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </span>
    </div>
  )
}

function WeaponsShowcase() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60">
        <Zap className="size-4 text-arena-rose" />
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider">
          Weapons
        </h2>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">8 in arsenal</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-2.5">
        {(Object.entries(WEAPONS) as [WeaponType, (typeof WEAPONS)[WeaponType]][]).map(
          ([type, cfg]) => {
            const Icon = WEAPON_ICON[type]
            return (
              <div
                key={type}
                title={cfg.description}
                className="group flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border border-border/60 bg-background/40 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Icon className="size-3.5 text-foreground/80 group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-medium">{WEAPON_LABEL[type]}</span>
                <span className="text-[9px] font-mono text-arena-amber">{cfg.cost}</span>
              </div>
            )
          },
        )}
      </div>
    </div>
  )
}

function FeaturedProblem({
  slug,
  title,
  difficulty,
  category,
}: {
  slug: string
  title: string
  difficulty: string
  category: string
}) {
  const cat = (category as ProblemCategory)
  const label = PROBLEM_CATEGORY_LABELS[cat] ?? category
  return (
    <div className="rounded-2xl border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden p-4">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="size-4 text-arena-amber" />
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider">
          Latest Problem
        </h2>
      </div>
      <div className="font-display font-bold text-lg leading-tight mb-2">{title}</div>
      <div className="flex items-center gap-2">
        <Badge
          variant={
            difficulty === 'easy' ? 'emerald' : difficulty === 'medium' ? 'amber' : 'rose'
          }
          className="uppercase font-semibold text-[10px]"
        >
          {difficulty}
        </Badge>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          {label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">/{slug}</span>
      </div>
    </div>
  )
}

/* ─── Bits ─── */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="size-4 text-yellow-400" />
  if (rank === 2) return <Medal className="size-4 text-gray-300" />
  if (rank === 3) return <Medal className="size-4 text-amber-600" />
  return <span className="text-muted-foreground font-mono text-xs">#{rank}</span>
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'bronze':
      return 'text-amber-600'
    case 'silver':
      return 'text-gray-300'
    case 'gold':
      return 'text-yellow-400'
    case 'platinum':
      return 'text-cyan-400'
    case 'diamond':
      return 'text-violet-400'
    default:
      return 'text-muted-foreground'
  }
}
