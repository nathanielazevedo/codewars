'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Swords,
  UserPlus,
  Check,
  X,
  UserMinus,
  Search,
  Loader2,
  Bot,
} from 'lucide-react'
import { usePresence } from '@/components/presence-provider'

interface FriendUser {
  id: string
  username: string
  avatarUrl: string | null
  elo: number
  rankTier: string
  friendshipId: string
  online?: boolean
  matchId?: string | null
}

interface SearchResult {
  id: string
  username: string
  avatarUrl: string | null
  elo: number
  rankTier: string
  isBot: boolean
  relationship: 'friends' | 'incoming' | 'outgoing' | 'none'
}

export default function FriendsClient() {
  const router = useRouter()
  const { presence, track, untrack } = usePresence()
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [incoming, setIncoming] = useState<FriendUser[]>([])
  const [outgoing, setOutgoing] = useState<FriendUser[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)

  async function fetchFriends() {
    setLoading(true)
    const res = await fetch('/api/friends')
    if (res.ok) {
      const data = await res.json()
      setFriends(data.friends)
      setIncoming(data.incoming)
      setOutgoing(data.outgoing)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFriends()
  }, [])

  // Track presence for friends list
  useEffect(() => {
    const ids = friends.map((f) => f.id)
    if (!ids.length) return
    track(ids)
    return () => untrack(ids)
  }, [friends, track, untrack])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results ?? [])
        }
      } finally {
        setSearching(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function sendRequestById(username: string) {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (res.ok) {
      fetchFriends()
      // Re-run search to refresh relationship
      setResults((prev) =>
        prev.map((r) =>
          r.username === username ? { ...r, relationship: 'outgoing' } : r,
        ),
      )
    }
  }

  async function handleAction(friendshipId: string, action: 'accept' | 'reject') {
    await fetch(`/api/friends/${friendshipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    fetchFriends()
  }

  async function removeFriend(friendshipId: string) {
    await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
    fetchFriends()
  }

  async function challenge(friendshipId: string) {
    setChallengeError(null)
    const res = await fetch(`/api/friends/${friendshipId}/challenge`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setChallengeError(data.error ?? 'Failed to send challenge')
      return
    }
    const { room } = await res.json()
    router.push(`/room/${room.code}`)
  }

  const friendsRanked = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const pa = presence[a.id]
        const pb = presence[b.id]
        const aOnline = (pa?.online ?? a.online) ? 1 : 0
        const bOnline = (pb?.online ?? b.online) ? 1 : 0
        if (aOnline !== bOnline) return bOnline - aOnline
        return a.username.localeCompare(b.username)
      }),
    [friends, presence],
  )

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
            href="/profile"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Profile
          </Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl mb-6">Friends</h1>

        <SearchBox
          query={query}
          setQuery={setQuery}
          results={results}
          searching={searching}
          onSendRequest={sendRequestById}
        />

        {challengeError && (
          <div className="mb-6 rounded-lg px-4 py-2.5 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
            {challengeError}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-8">
            {incoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Incoming Requests ({incoming.length})
                </h2>
                <div className="space-y-2">
                  {incoming.map((user) => (
                    <div
                      key={user.friendshipId}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-card/40 px-4 py-3"
                    >
                      <Link
                        href={`/u/${user.username}`}
                        className="flex items-center gap-3 hover:text-primary transition-colors"
                      >
                        <Avatar user={user} />
                        <div>
                          <div className="font-medium text-sm">{user.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.elo} Elo · <span className="capitalize">{user.rankTier}</span>
                          </div>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(user.friendshipId, 'accept')}
                          className="rounded-lg bg-green-600 p-2 hover:bg-green-700 transition-colors"
                          title="Accept"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          onClick={() => handleAction(user.friendshipId, 'reject')}
                          className="rounded-lg bg-red-600/80 p-2 hover:bg-red-700 transition-colors"
                          title="Reject"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {outgoing.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Pending Requests ({outgoing.length})
                </h2>
                <div className="space-y-2">
                  {outgoing.map((user) => (
                    <div
                      key={user.friendshipId}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-card/40 px-4 py-3"
                    >
                      <Link
                        href={`/u/${user.username}`}
                        className="flex items-center gap-3 hover:text-primary transition-colors"
                      >
                        <Avatar user={user} />
                        <div>
                          <div className="font-medium text-sm">{user.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.elo} Elo · <span className="capitalize">{user.rankTier}</span>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeFriend(user.friendshipId)}
                        className="rounded-lg bg-gray-700 px-3 py-1.5 hover:bg-gray-600 transition-colors text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Friends ({friends.length})
              </h2>
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No friends yet. Search for someone above!
                </p>
              ) : (
                <div className="space-y-2">
                  {friendsRanked.map((user) => {
                    const p = presence[user.id]
                    const online = p?.online ?? user.online ?? false
                    const inMatch = p?.matchId ?? user.matchId ?? null
                    return (
                      <div
                        key={user.friendshipId}
                        className="flex items-center justify-between rounded-lg border border-border/80 bg-card/40 px-4 py-3"
                      >
                        <Link
                          href={`/u/${user.username}`}
                          className="flex items-center gap-3 hover:text-primary transition-colors flex-1 min-w-0"
                        >
                          <div className="relative">
                            <Avatar user={user} />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${
                                online ? 'bg-green-500' : 'bg-zinc-600'
                              }`}
                              title={online ? 'Online' : 'Offline'}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{user.username}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {inMatch ? (
                                <span className="inline-flex items-center gap-1 text-amber-400">
                                  <Swords className="size-3" /> In a match
                                </span>
                              ) : online ? (
                                <span className="text-green-400">Online</span>
                              ) : (
                                <span>{user.elo} Elo · <span className="capitalize">{user.rankTier}</span></span>
                              )}
                            </div>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => challenge(user.friendshipId)}
                            disabled={!!inMatch}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 text-primary px-2.5 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={inMatch ? 'Already in a match' : 'Challenge to a match'}
                          >
                            <Swords className="size-3.5" />
                            Challenge
                          </button>
                          <button
                            onClick={() => removeFriend(user.friendshipId)}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove friend"
                          >
                            <UserMinus className="size-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function SearchBox({
  query,
  setQuery,
  results,
  searching,
  onSendRequest,
}: {
  query: string
  setQuery: (q: string) => void
  results: SearchResult[]
  searching: boolean
  onSendRequest: (username: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={wrapRef} className="relative mb-8">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players by username…"
          className="w-full rounded-lg border border-border bg-card/60 pl-9 pr-10 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 rounded-lg border border-border bg-card/95 backdrop-blur shadow-lg z-30 overflow-hidden">
          {results.length === 0 && !searching ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No players found
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <Link
                    href={`/u/${r.username}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={() => setOpen(false)}
                  >
                    <Avatar user={r} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1.5">
                        {r.username}
                        {r.isBot && <Bot className="size-3 text-muted-foreground" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.elo} Elo · <span className="capitalize">{r.rankTier}</span>
                      </div>
                    </div>
                  </Link>
                  <SearchRowAction r={r} onSendRequest={onSendRequest} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SearchRowAction({
  r,
  onSendRequest,
}: {
  r: SearchResult
  onSendRequest: (username: string) => void
}) {
  if (r.relationship === 'friends') {
    return <span className="text-xs text-green-400 font-medium">Friends</span>
  }
  if (r.relationship === 'outgoing') {
    return <span className="text-xs text-muted-foreground">Requested</span>
  }
  if (r.relationship === 'incoming') {
    return (
      <button
        onClick={(e) => {
          e.preventDefault()
          onSendRequest(r.username)
        }}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Check className="size-3" /> Accept
      </button>
    )
  }
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        onSendRequest(r.username)
      }}
      className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/30 text-primary px-2.5 py-1 text-xs font-semibold hover:bg-primary/20"
    >
      <UserPlus className="size-3" /> Add
    </button>
  )
}

function Avatar({ user }: { user: { username: string; avatarUrl: string | null } }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
  }
  return (
    <div className="size-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 grid place-items-center text-xs font-bold">
      {user.username[0].toUpperCase()}
    </div>
  )
}
