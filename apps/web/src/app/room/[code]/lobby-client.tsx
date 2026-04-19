'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import {
  Check,
  Copy,
  Crown,
  Loader2,
  Play,
  Swords,
  Users,
} from 'lucide-react'
import type { Room, RoomPlayer } from '@/lib/rooms'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function LobbyClient({
  initialRoom,
  currentUserId,
}: {
  initialRoom: Room
  currentUserId: string
}) {
  const router = useRouter()
  const [room, setRoom] = useState<Room>(initialRoom)
  const [joining, startJoin] = useTransition()
  const [starting, startStart] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isMember = room.players.some((p) => p.userId === currentUserId)
  const isHost = room.hostId === currentUserId

  useEffect(() => {
    if (isMember) return
    startJoin(async () => {
      try {
        const res = await fetch(`/api/rooms/${room.code}/join`, { method: 'POST' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        const { room: updated } = await res.json()
        setRoom(updated)
      } catch (e) {
        setError((e as Error).message)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        socket.on('connect', () => socket!.emit('room:join', { code: room.code }))

        socket.on('lobby:player_joined', ({ player }: { player: RoomPlayer }) => {
          setRoom((r) =>
            r.players.some((p) => p.userId === player.userId)
              ? r
              : { ...r, players: [...r.players, player] },
          )
        })

        socket.on('lobby:player_left', ({ userId }: { userId: string }) => {
          setRoom((r) => ({ ...r, players: r.players.filter((p) => p.userId !== userId) }))
        })

        socket.on('game:start', ({ matchId }: { matchId: string }) => {
          router.push(`/match/${matchId}`)
        })

        socket.on('connect_error', (err) => setError(`Socket: ${err.message}`))
      } catch (e) {
        setError((e as Error).message)
      }
    })()

    return () => {
      cancelled = true
      socket?.disconnect()
    }
  }, [room.code, router])

  useEffect(() => {
    const onUnload = () => navigator.sendBeacon(`/api/rooms/${room.code}/leave`)
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [room.code])

  async function handleStart() {
    startStart(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/rooms/${room.code}/start`, { method: 'POST' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  async function handleCopy() {
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/room/${room.code}` : ''
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

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
        <Badge variant="outline" className="text-xs">
          Private Room
        </Badge>
      </header>

      <section className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl animate-fade-in-up">
          {/* Room code card */}
          <div className="text-center mb-8">
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Room Code
            </div>
            <div className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-sm shadow-glow">
              <div className="font-display font-bold text-7xl tracking-[0.2em] bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                {room.code}
              </div>
            </div>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <Check className="text-arena-emerald" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy />
                    Copy invite link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Players card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <h2 className="font-display font-semibold">Players</h2>
                  <Badge variant="outline">{room.players.length}</Badge>
                </div>
                {joining && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Joining…
                  </div>
                )}
              </div>

              <ul className="space-y-2">
                {room.players.map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-border grid place-items-center">
                        <span className="text-sm font-semibold font-display">
                          {p.username.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {p.username}
                          {p.userId === currentUserId && (
                            <span className="text-muted-foreground text-xs">(you)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">ELO {p.elo}</div>
                      </div>
                    </div>
                    {p.userId === room.hostId && (
                      <Badge variant="amber">
                        <Crown className="size-3" />
                        HOST
                      </Badge>
                    )}
                  </li>
                ))}
                {/* empty slot placeholder */}
                {room.players.length < 2 && (
                  <li className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
                    <div className="size-8 rounded-full border border-dashed border-border" />
                    <span>Waiting for opponent…</span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Action */}
          <div className="mt-6">
            {isHost ? (
              <Button
                onClick={handleStart}
                disabled={starting || room.players.length < 2}
                size="xl"
                variant="primary"
                className="w-full"
              >
                {starting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Starting match…
                  </>
                ) : room.players.length < 2 ? (
                  <>Waiting for at least 2 players…</>
                ) : (
                  <>
                    <Play />
                    Start Match
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-3">
                <Loader2 className="inline size-3 animate-spin mr-1.5" />
                Waiting for host to start…
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
