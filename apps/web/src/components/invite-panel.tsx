'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Check, Loader2, Search, UserPlus } from 'lucide-react'

interface SearchResult {
  id: string
  username: string
  avatarUrl: string | null
  elo: number
  rankTier: string
  isBot: boolean
  relationship: 'friends' | 'incoming' | 'outgoing' | 'none'
}

export function InvitePanel({
  roomCode,
  excludeUserIds,
}: {
  roomCode: string
  excludeUserIds: string[]
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const excludeRef = useRef(new Set(excludeUserIds))

  useEffect(() => {
    excludeRef.current = new Set(excludeUserIds)
  }, [excludeUserIds])

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

  async function sendInvite(targetId: string) {
    setError(null)
    const res = await fetch(`/api/rooms/${roomCode}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to send invite')
      return
    }
    setSent((prev) => {
      const next = new Set(prev)
      next.add(targetId)
      return next
    })
  }

  const visible = results.filter((r) => !r.isBot && !excludeRef.current.has(r.id))

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="size-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Invite players</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="w-full rounded-lg border border-border bg-background/60 pl-9 pr-10 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}

      {query.trim().length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border/60">
          {visible.length === 0 && !searching ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No players found
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {visible.map((r) => {
                const already = sent.has(r.id)
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {r.avatarUrl ? (
                        <img
                          src={r.avatarUrl}
                          alt=""
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 grid place-items-center text-xs font-bold">
                          {r.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {r.username}
                          {r.isBot && <Bot className="size-3 text-muted-foreground" />}
                          {r.relationship === 'friends' && (
                            <span className="text-[10px] uppercase tracking-wider text-green-400">Friend</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.elo} Elo · <span className="capitalize">{r.rankTier}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => sendInvite(r.id)}
                      disabled={already}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/30 text-primary px-2.5 py-1 text-xs font-semibold hover:bg-primary/20 disabled:opacity-60 disabled:cursor-default"
                    >
                      {already ? (
                        <>
                          <Check className="size-3" />
                          Sent
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-3" />
                          Invite
                        </>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
