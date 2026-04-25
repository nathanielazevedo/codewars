'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { io, type Socket } from 'socket.io-client'
import { Swords, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type PresenceStatus = {
  online: boolean
  matchId: string | null
}

type ChallengeInvite = {
  id: string
  kind: 'challenge' | 'invite'
  fromId: string
  fromUsername: string
  roomCode: string
  sentAt: number
}

type PresenceContextValue = {
  presence: Record<string, PresenceStatus>
  track: (userIds: string[]) => void
  untrack: (userIds: string[]) => void
}

const PresenceContext = createContext<PresenceContextValue | null>(null)

export function usePresence() {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence must be used inside PresenceProvider')
  return ctx
}

export function PresenceProvider({
  currentUserId,
  children,
}: {
  currentUserId: string | null
  children: React.ReactNode
}) {
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({})
  const [invites, setInvites] = useState<ChallengeInvite[]>([])
  const trackedRef = useRef<Map<string, number>>(new Map())
  const pendingFetchRef = useRef<Set<string>>(new Set())
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushFetch = useCallback(() => {
    fetchTimerRef.current = null
    const ids = Array.from(pendingFetchRef.current)
    pendingFetchRef.current.clear()
    if (!ids.length) return
    fetch(`/api/presence?userIds=${ids.join(',')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.presence) return
        setPresence((prev) => ({ ...prev, ...data.presence }))
      })
      .catch(() => {})
  }, [])

  const queueFetch = useCallback(
    (ids: string[]) => {
      ids.forEach((id) => pendingFetchRef.current.add(id))
      if (fetchTimerRef.current) return
      fetchTimerRef.current = setTimeout(flushFetch, 50)
    },
    [flushFetch],
  )

  const track = useCallback(
    (userIds: string[]) => {
      const fresh: string[] = []
      for (const id of userIds) {
        const n = trackedRef.current.get(id) ?? 0
        trackedRef.current.set(id, n + 1)
        if (n === 0) fresh.push(id)
      }
      if (fresh.length) queueFetch(fresh)
    },
    [queueFetch],
  )

  const untrack = useCallback((userIds: string[]) => {
    for (const id of userIds) {
      const n = trackedRef.current.get(id) ?? 0
      if (n <= 1) trackedRef.current.delete(id)
      else trackedRef.current.set(id, n - 1)
    }
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    let socket: Socket | null = null
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/arena-token')
        if (!res.ok) return
        const { token } = await res.json()
        if (cancelled) return

        socket = io(API_URL, { auth: { token } })

        socket.on('presence:online', ({ userId }: { userId: string }) => {
          setPresence((prev) => ({
            ...prev,
            [userId]: { online: true, matchId: prev[userId]?.matchId ?? null },
          }))
        })
        socket.on('presence:offline', ({ userId }: { userId: string }) => {
          setPresence((prev) => ({ ...prev, [userId]: { online: false, matchId: null } }))
        })
        socket.on(
          'presence:in_match',
          ({ userId, matchId }: { userId: string; matchId: string | null }) => {
            setPresence((prev) => ({
              ...prev,
              [userId]: { online: prev[userId]?.online ?? true, matchId },
            }))
          },
        )
        const pushInvite = (
          kind: 'challenge' | 'invite',
          evt: { fromId: string; fromUsername: string; roomCode: string; sentAt: number },
        ) => {
          const id = `${kind}:${evt.fromId}:${evt.sentAt}`
          setInvites((prev) => [...prev, { id, kind, ...evt }])
          setTimeout(() => {
            setInvites((prev) => prev.filter((i) => i.id !== id))
          }, 30000)
        }
        socket.on(
          'friend:challenge',
          (evt: { fromId: string; fromUsername: string; roomCode: string; sentAt: number }) =>
            pushInvite('challenge', evt),
        )
        socket.on(
          'room:invite',
          (evt: { fromId: string; fromUsername: string; roomCode: string; sentAt: number }) =>
            pushInvite('invite', evt),
        )
      } catch {
        // swallow
      }
    })()

    return () => {
      cancelled = true
      socket?.disconnect()
    }
  }, [currentUserId])

  const value = useMemo(() => ({ presence, track, untrack }), [presence, track, untrack])

  return (
    <PresenceContext.Provider value={value}>
      {children}
      {invites.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80">
          {invites.map((invite) => (
            <InviteToast
              key={invite.id}
              invite={invite}
              onDismiss={() =>
                setInvites((prev) => prev.filter((i) => i.id !== invite.id))
              }
            />
          ))}
        </div>
      )}
    </PresenceContext.Provider>
  )
}

function InviteToast({
  invite,
  onDismiss,
}: {
  invite: ChallengeInvite
  onDismiss: () => void
}) {
  return (
    <div className="rounded-xl border border-primary/40 bg-card/95 backdrop-blur shadow-glow p-4 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center">
            <Swords className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <div className="text-sm leading-tight">
            <div className="font-medium">
              <span className="text-primary">{invite.fromUsername}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {invite.kind === 'invite' ? 'is inviting you to war' : 'challenges you to a match'}
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/room/${invite.roomCode}`}
          onClick={onDismiss}
          className="flex-1 rounded-md bg-primary text-primary-foreground text-sm font-semibold py-2 text-center hover:bg-primary/90 transition-colors"
        >
          Accept
        </Link>
        <button
          onClick={onDismiss}
          className="flex-1 rounded-md border border-border bg-card text-sm font-medium py-2 hover:bg-accent transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
