'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, Trophy, Medal } from 'lucide-react'

interface LeaderboardUser {
  rank: number
  id: string
  username: string
  avatarUrl: string | null
  elo: number
  xp: number
  rankTier: string
  matchesPlayed: number
}

export default function LeaderboardClient() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard?limit=50')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users)
        setLoading(false)
      })
  }, [])

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
          <Link href="/friends" className="text-muted-foreground hover:text-foreground transition-colors">Friends</Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="size-6 text-arena-amber" />
          <h1 className="font-display font-bold text-2xl">Leaderboard</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card/30 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-16">Rank</th>
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-right">Elo</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">XP</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Matches</th>
                  <th className="px-4 py-3 text-right">Tier</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border/30 hover:bg-card/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <RankBadge rank={user.rank} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/u/${user.username}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                        ) : (
                          <div className="size-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 grid place-items-center text-xs font-bold">
                            {user.username[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{user.username}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{user.elo}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{user.xp}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{user.matchesPlayed}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold capitalize ${tierColor(user.rankTier)}`}>
                        {user.rankTier}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No players yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="size-5 text-yellow-400" />
  if (rank === 2) return <Medal className="size-5 text-gray-300" />
  if (rank === 3) return <Medal className="size-5 text-amber-600" />
  return <span className="text-muted-foreground font-mono">#{rank}</span>
}

function tierColor(tier: string): string {
  switch (tier) {
    case 'bronze': return 'text-amber-600'
    case 'silver': return 'text-gray-300'
    case 'gold': return 'text-yellow-400'
    case 'platinum': return 'text-cyan-400'
    case 'diamond': return 'text-violet-400'
    default: return 'text-muted-foreground'
  }
}
