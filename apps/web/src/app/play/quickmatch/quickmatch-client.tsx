'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { Loader2, Swords, Users, X } from 'lucide-react'
import { QUICKMATCH, type QueuedPlayer, type QueueStatus } from '@code-arena/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChatPanel, type ChatMessageView } from '@/components/chat-panel'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function PlayerRow({ player, isYou }: { player: QueuedPlayer; isYou: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
        isYou
          ? 'border-primary/40 bg-primary/10'
          : 'border-border/70 bg-background/40'
      }`}
    >
      {player.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.avatarUrl}
          alt=""
          className="size-7 rounded-full shrink-0 object-cover border border-border/60"
        />
      ) : (
        <div className="size-7 rounded-full shrink-0 bg-gradient-to-br from-primary/30 to-secondary/30 border border-border grid place-items-center text-[11px] font-bold font-display">
          {player.username[0]?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{player.username}</span>
          {isYou && <span className="text-[10px] text-muted-foreground">(you)</span>}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono tabular-nums">
          ELO {player.elo}
        </div>
      </div>
    </div>
  )
}

export function QuickMatchClient({
  currentUserId,
  initialStatus,
}: {
  currentUserId: string
  initialStatus: QueueStatus
}) {
  const router = useRouter()
  const [status, setStatus] = useState<QueueStatus>(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [chat, setChat] = useState<ChatMessageView[]>([])
  const joinedRef = useRef(false)

  const { count, countdownEnds, players } = status
  const pct = Math.min(1, count / QUICKMATCH.MAX_PLAYERS)
  const countdownLeft = countdownEnds ? Math.max(0, countdownEnds - now) : null
  const countdownSecs = countdownLeft !== null ? Math.ceil(countdownLeft / 1000) : null

  // Ticking clock for countdown display
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(i)
  }, [])

  // Join queue on mount
  useEffect(() => {
    if (joinedRef.current) return
    joinedRef.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/queue/quickmatch', { method: 'POST' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as QueueStatus
        setStatus(data)
      } catch (e) {
        setError((e as Error).message)
      }
    })()
  }, [])

  // Socket wiring
  useEffect(() => {
    let socket: Socket | null = null
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/arena-token')
        if (!res.ok) throw new Error('Token fetch failed')
        const { token } = await res.json()
        if (cancelled) return

        socket = io(API_URL, { auth: { token } })
        socket.on('connect', () => socket!.emit('queue:enter'))

        socket.on(
          'queue:update',
          (u: {
            count: number
            countdownEnds: number | null
            players?: QueuedPlayer[]
          }) => {
            setStatus((s) => ({
              ...s,
              count: u.count,
              countdownEnds: u.countdownEnds,
              players: u.players ?? s.players,
            }))
          },
        )

        socket.on('queue:matched', ({ matchId, userIds }: { matchId: string; userIds: string[] }) => {
          if (userIds.includes(currentUserId)) {
            router.push(`/match/${matchId}`)
          }
        })

        socket.on('queue:chat', ({ message }: { message: ChatMessageView }) => {
          setChat((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message],
          )
        })

        socket.on('connect_error', (err) => setError(`Socket: ${err.message}`))
      } catch (e) {
        setError((e as Error).message)
      }
    })()

    return () => {
      cancelled = true
      socket?.emit('queue:exit')
      socket?.disconnect()
    }
  }, [currentUserId, router])

  // Best-effort leave queue on tab close
  useEffect(() => {
    const onUnload = () => navigator.sendBeacon('/api/queue/quickmatch/beacon')
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  // Chat history on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/queue/quickmatch/chat')
      if (!res.ok || cancelled) return
      const data = await res.json()
      setChat(data.messages ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCancel() {
    setCancelling(true)
    try {
      await fetch('/api/queue/quickmatch', { method: 'DELETE' })
    } catch {
      /* ignore */
    }
    router.push('/')
  }

  const waitingForMore = count < QUICKMATCH.MIN_PLAYERS
  const isCritical = countdownSecs !== null && countdownSecs <= 3 && countdownSecs > 0
  const isHot = countdownSecs !== null && countdownSecs <= 5

  return (
    <main className="relative min-h-screen flex flex-col arena-bg-live arena-orbs arena-scanline overflow-hidden">
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/60 backdrop-blur-sm bg-background/40">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-glow-sm">
            <Swords className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg">
            Code<span className="text-primary">Arena</span>
          </span>
        </div>
        <Badge variant="primary" className="gap-1.5 py-1">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative size-2 rounded-full bg-primary" />
          </span>
          Searching
        </Badge>
      </header>

      <section className="relative z-10 flex-1 flex items-start justify-center p-6 md:p-8">
        <div className="w-full max-w-6xl animate-fade-in-up grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card
            key={isCritical ? `crit-${countdownSecs}` : 'idle'}
            className={`shadow-glow lg:col-span-2 ${isCritical ? 'animate-shake-hard ring-glow-rose' : ''}`}
          >
            <CardContent className="p-10">
              {/* Radar-ish icon with sweeping beam */}
              <div className="flex justify-center mb-6">
                <div className="relative size-24">
                  <div className="absolute inset-0 rounded-full border border-primary/30" />
                  <div className="absolute inset-3 rounded-full border border-primary/30" />
                  <div
                    className="absolute inset-0 rounded-full border border-primary/50 animate-pulse-glow"
                    style={{ animationDuration: '1.8s' }}
                  />
                  <div className={`radar-sweep ${isHot ? '' : 'radar-sweep-slow'}`} />
                  {/* center crosshair */}
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="size-1 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.9)]" />
                  </div>
                  <div className="absolute inset-0 grid place-items-center">
                    <Swords className="size-7 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  Quick Match
                </div>
                {countdownSecs !== null && !waitingForMore ? (
                  <>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/80 mb-1">
                      {count >= QUICKMATCH.MAX_PLAYERS ? 'Arena full — going live' : 'Starting in'}
                    </div>
                    <div
                      className={`font-display font-bold tracking-tight tabular-nums ${
                        isCritical
                          ? 'text-7xl animate-pulse-danger'
                          : isHot
                            ? 'text-6xl text-arena-amber text-glow-cyan'
                            : 'text-6xl'
                      }`}
                    >
                      {countdownSecs}
                      <span className="text-2xl text-muted-foreground/70 ml-1">s</span>
                    </div>
                  </>
                ) : (
                  <h1 className="font-display text-3xl font-bold tracking-tight">
                    {waitingForMore ? 'Finding players…' : 'Preparing arena…'}
                  </h1>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {waitingForMore
                    ? `Waiting for at least ${QUICKMATCH.MIN_PLAYERS} players to drop in.`
                    : count >= QUICKMATCH.MAX_PLAYERS
                      ? 'Lock in. Arena is hot.'
                      : 'Match starts when timer ends or lobby fills.'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    <span className="uppercase tracking-wider">Players</span>
                  </div>
                  <div className="font-mono tabular-nums">
                    <span className="text-foreground font-semibold text-sm">{count}</span>
                    <span className="text-muted-foreground"> / {QUICKMATCH.MAX_PLAYERS}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden border border-border/60">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              </div>

              {/* Player roster */}
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {players.map((p) => (
                    <PlayerRow
                      key={p.userId}
                      player={p}
                      isYou={p.userId === currentUserId}
                    />
                  ))}
                  {Array.from({
                    length: Math.max(0, QUICKMATCH.MIN_PLAYERS - players.length),
                  }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-2.5 rounded-lg border border-dashed border-border/50 px-2.5 py-2 text-xs text-muted-foreground"
                    >
                      <div className="size-7 rounded-full border border-dashed border-border/60" />
                      <span>Waiting…</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Countdown timer bar */}
              {countdownSecs !== null && countdownLeft !== null && (
                <div className="mb-6">
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden border border-border/40">
                    <div
                      className={`h-full transition-all duration-200 ease-linear ${
                        isCritical
                          ? 'bg-arena-rose shadow-[0_0_14px_hsl(var(--arena-rose)/0.8)]'
                          : isHot
                            ? 'bg-arena-amber shadow-[0_0_10px_hsl(var(--arena-amber)/0.6)]'
                            : 'bg-gradient-to-r from-arena-cyan to-arena-amber'
                      }`}
                      style={{
                        width: `${(countdownLeft / QUICKMATCH.COUNTDOWN_MS) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleCancel}
                disabled={cancelling}
                variant="outline"
                className="w-full"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  <>
                    <X />
                    Cancel
                  </>
                )}
              </Button>

              {error && (
                <p className="mt-4 text-center text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>

          <ChatPanel
            currentUserId={currentUserId}
            messages={chat}
            subtitle="Queue chat"
            emptyHint="Nobody's said anything yet. Stake your claim."
            height="h-[28rem] lg:h-[32rem]"
            onSend={async (text) => {
              const res = await fetch('/api/queue/quickmatch/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
              })
              if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                if (res.status === 429) {
                  throw new Error(`Slow down — try again in ${d.retryAfterSec ?? 'a few'}s`)
                }
                throw new Error(d.error ?? 'Failed to send')
              }
            }}
          />
        </div>
      </section>
    </main>
  )
}
