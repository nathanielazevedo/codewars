'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { Loader2, Swords, Users, X } from 'lucide-react'
import { QUICKMATCH, type QueueStatus } from '@code-arena/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChatPanel, type ChatMessageView } from '@/components/chat-panel'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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

  const { count, countdownEnds } = status
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

        socket.on('queue:update', (u: { count: number; countdownEnds: number | null }) => {
          setStatus((s) => ({ ...s, count: u.count, countdownEnds: u.countdownEnds }))
        })

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

  return (
    <main className="relative min-h-screen flex flex-col arena-bg">
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

      <section className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg animate-fade-in-up space-y-6">
          <Card className="shadow-glow">
            <CardContent className="p-10">
              {/* Radar-ish icon */}
              <div className="flex justify-center mb-6">
                <div className="relative size-20">
                  <div className="absolute inset-0 rounded-full border border-primary/30" />
                  <div
                    className="absolute inset-2 rounded-full border border-primary/40 animate-pulse-glow"
                    style={{ animationDuration: '1.8s' }}
                  />
                  <div className="absolute inset-0 grid place-items-center">
                    <Swords className="size-8 text-primary" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  Quick Match
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {waitingForMore
                    ? 'Finding players…'
                    : countdownSecs !== null
                      ? `Starting in ${countdownSecs}s`
                      : 'Preparing arena…'}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {waitingForMore
                    ? `Waiting for at least ${QUICKMATCH.MIN_PLAYERS} players to drop in.`
                    : count >= QUICKMATCH.MAX_PLAYERS
                      ? 'Arena full. Going live.'
                      : 'Match starts when timer ends or lobby fills.'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
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
                {/* Player dots */}
                <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                  {Array.from({ length: QUICKMATCH.MAX_PLAYERS }, (_, i) => (
                    <div
                      key={i}
                      className={
                        i < count
                          ? 'size-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]'
                          : 'size-2 rounded-full bg-muted/60 border border-border'
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Countdown timer bar */}
              {countdownSecs !== null && countdownLeft !== null && (
                <div className="mb-6">
                  <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full bg-arena-amber transition-all duration-200 ease-linear"
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
            onSend={async (text) => {
              const res = await fetch('/api/queue/quickmatch/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
              })
              if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                throw new Error(d.error ?? 'Failed to send')
              }
            }}
          />
        </div>
      </section>
    </main>
  )
}
