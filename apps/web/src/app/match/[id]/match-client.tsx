'use client'

import { useEffect, useMemo, useState, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import {
  Bomb,
  Check,
  Clock,
  Crown,
  Eye,
  Flame,
  Home,
  Loader2,
  Lock,
  Play,
  Radiation,
  RotateCcw,
  Shield,
  Shuffle,
  Snowflake,
  Swords,
  Trophy,
  UserPlus,
  X,
  Zap,
} from 'lucide-react'
import type { Match } from '@/lib/matches'
import type { Language, Problem } from '@/lib/problems'
import type { ExecutionStatus, TestResult } from '@/lib/piston'
import { WEAPONS, type WeaponType, type PlayerGameState } from '@code-arena/types'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CodeEditor } from '@/components/code-editor'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type SubmitResponse = {
  status: ExecutionStatus
  testResults: TestResult[]
  testsPassed: number
  totalTests: number
  finished: boolean
  matchStatus?: 'active' | 'finished'
  mirage?: boolean
}

type ActiveEffect = {
  weaponType: WeaponType
  attackerUsername: string
  expiresAt: number
}

type WeaponNotification = {
  id: number
  message: string
  type: 'incoming' | 'blocked' | 'info'
  expiresAt: number
}

type Placement = Match['placements'][number]

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
  screen_lock: 'Screen Lock',
  shuffle: 'Shuffle',
  mirage: 'Mirage',
  code_bomb: 'Code Bomb',
  shield: 'Shield',
  time_warp: 'Time Warp',
  nuke: 'Nuke',
}

const DIFF_VARIANT: Record<string, 'emerald' | 'amber' | 'rose' | 'default'> = {
  easy: 'emerald',
  medium: 'amber',
  hard: 'rose',
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MatchClient({
  initialMatch,
  problem,
  currentUserId,
}: {
  initialMatch: Match
  problem: Problem
  currentUserId: string
}) {
  const router = useRouter()
  const [match, setMatch] = useState<Match>(initialMatch)
  const [language, setLanguage] = useState<Language>('javascript')
  const [code, setCode] = useState<string>(problem.starterCode[language])
  const [submitting, startSubmit] = useTransition()
  const [result, setResult] = useState<SubmitResponse | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([])
  const [notifications, setNotifications] = useState<WeaponNotification[]>([])
  const [firingWeapon, setFiringWeapon] = useState(false)
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(
    Math.max(0, initialMatch.endsAt - Date.now()),
  )
  const [endPlacements, setEndPlacements] = useState<Placement[] | null>(null)
  const [endEloDeltas, setEndEloDeltas] = useState<Record<string, number>>({})
  const [endXpDeltas, setEndXpDeltas] = useState<Record<string, number>>({})
  const notifIdRef = useRef(0)
  const codeRef = useRef(code)
  codeRef.current = code

  const isSpectator = !match.players.some((p) => p.userId === currentUserId)
  const [viewerCount, setViewerCount] = useState(0)
  const myState: PlayerGameState | undefined = match.playerStates?.[currentUserId]
  const ap = myState?.ap ?? 0
  const isOver = match.status === 'finished'
  const myPlacement = endPlacements?.find((p) => p.userId === currentUserId)?.placement ?? null
  const isFrozen = (myState?.frozenUntil ?? 0) > Date.now()
  const myFinished = (myState?.finishedAt ?? null) !== null

  const addNotification = useCallback((message: string, type: WeaponNotification['type']) => {
    const id = ++notifIdRef.current
    setNotifications((prev) => [...prev, { id, message, type, expiresAt: Date.now() + 3000 }])
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    if (activeEffects.length === 0) return
    const nearest = Math.min(...activeEffects.map((e) => e.expiresAt))
    const ms = nearest - Date.now()
    if (ms <= 0) {
      setActiveEffects((prev) => prev.filter((e) => e.expiresAt > Date.now()))
      return
    }
    const timer = setTimeout(() => {
      setActiveEffects((prev) => prev.filter((e) => e.expiresAt > Date.now()))
    }, ms)
    return () => clearTimeout(timer)
  }, [activeEffects])

  useEffect(() => {
    let socket: Socket | null = null
    let cancelled = false

    ;(async () => {
      const res = await fetch('/api/arena-token')
      if (!res.ok) return
      const { token } = await res.json()
      if (cancelled) return

      socket = io(API_URL, { auth: { token } })
      socket.on('connect', () => socket!.emit('match:join', { matchId: match.id }))

      socket.on(
        'player:progress',
        ({
          userId,
          testsPassed,
          totalTests,
          finishedAt,
        }: {
          userId: string
          testsPassed: number
          totalTests: number
          finishedAt: number | null
        }) => {
          setMatch((m) => ({
            ...m,
            playerStates: {
              ...m.playerStates,
              [userId]: {
                ...m.playerStates[userId],
                testsPassed,
                totalTests,
                finishedAt,
              },
            },
          }))
        },
      )

      socket.on(
        'player:finished',
        ({ userId, username }: { userId: string; username: string }) => {
          if (userId !== currentUserId) {
            addNotification(`${username} finished all tests`, 'info')
          }
        },
      )

      socket.on('game:tick', ({ timeRemainingMs: t }: { timeRemainingMs: number }) => {
        setTimeRemainingMs(t)
      })

      socket.on(
        'game:end',
        ({
          placements,
          eloDeltas,
          xpDeltas,
        }: {
          placements: Placement[]
          eloDeltas: Record<string, number>
          xpDeltas: Record<string, number>
        }) => {
          setEndPlacements(placements)
          setEndEloDeltas(eloDeltas ?? {})
          setEndXpDeltas(xpDeltas ?? {})
          setMatch((m) => ({ ...m, status: 'finished', placements, endedAt: Date.now() }))
        },
      )

      socket.on(
        'weapon:incoming',
        ({
          weaponType,
          attackerUsername,
          targetId,
          duration,
        }: {
          weaponType: WeaponType
          attackerId: string
          attackerUsername: string
          targetId: string
          duration: number
        }) => {
          if (targetId !== currentUserId) {
            const targetName =
              match.players.find((p) => p.userId === targetId)?.username ?? 'Someone'
            addNotification(
              `${attackerUsername} used ${WEAPON_LABEL[weaponType]} on ${targetName}`,
              'info',
            )
            return
          }
          addNotification(
            `${attackerUsername} hit you with ${WEAPON_LABEL[weaponType]}!`,
            'incoming',
          )
          applyClientEffect(weaponType, duration)
        },
      )

      socket.on(
        'weapon:blocked',
        ({ weaponType, targetId }: { weaponType: WeaponType; attackerId: string; targetId: string }) => {
          if (targetId === currentUserId) {
            addNotification(`Your shield blocked a ${WEAPON_LABEL[weaponType]}!`, 'blocked')
            setMatch((m) => ({
              ...m,
              playerStates: {
                ...m.playerStates,
                [currentUserId]: { ...m.playerStates[currentUserId], shield: false },
              },
            }))
          }
        },
      )

      socket.on('player:ap_update', ({ userId, ap: newAp }: { userId: string; ap: number }) => {
        setMatch((m) => ({
          ...m,
          playerStates: {
            ...m.playerStates,
            [userId]: { ...m.playerStates[userId], ap: newAp },
          },
        }))
      })

      socket.on('match:viewer_count', ({ count }: { count: number }) => {
        setViewerCount(count)
      })
    })()

    return () => {
      cancelled = true
      socket?.disconnect()
    }
  }, [match.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyClientEffect(weaponType: WeaponType, duration: number) {
    switch (weaponType) {
      case 'freeze': {
        const expiresAt = Date.now() + (duration || 20000)
        setActiveEffects((prev) => [
          ...prev,
          { weaponType: 'freeze', attackerUsername: '', expiresAt },
        ])
        setMatch((m) => ({
          ...m,
          playerStates: {
            ...m.playerStates,
            [currentUserId]: {
              ...m.playerStates[currentUserId],
              frozen: true,
              frozenUntil: expiresAt,
            },
          },
        }))
        setTimeout(() => {
          setMatch((m) => ({
            ...m,
            playerStates: {
              ...m.playerStates,
              [currentUserId]: { ...m.playerStates[currentUserId], frozen: false, frozenUntil: 0 },
            },
          }))
        }, duration || 20000)
        break
      }
      case 'screen_lock': {
        const expiresAt = Date.now() + (duration || 10000)
        setActiveEffects((prev) => [
          ...prev,
          { weaponType: 'screen_lock', attackerUsername: '', expiresAt },
        ])
        break
      }
      case 'shuffle': {
        const lines = codeRef.current.split('\n')
        for (let i = lines.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[lines[i], lines[j]] = [lines[j], lines[i]]
        }
        setCode(lines.join('\n'))
        break
      }
      case 'code_bomb': {
        const lines = codeRef.current.split('\n')
        if (lines.length > 0) {
          const lineIdx = Math.floor(Math.random() * lines.length)
          const junk = Array.from({ length: 5 }, () =>
            String.fromCharCode(33 + Math.floor(Math.random() * 94)),
          ).join('')
          lines[lineIdx] += junk
          setCode(lines.join('\n'))
        }
        break
      }
    }
  }

  async function fireWeapon(weaponType: WeaponType) {
    const targetId =
      weaponType === 'shield' || weaponType === 'time_warp'
        ? currentUserId
        : weaponType === 'nuke'
          ? currentUserId
          : selectedTarget

    if (!targetId) return
    setFiringWeapon(true)

    try {
      const res = await fetch('/api/weapons/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, weaponType, targetId }),
      })
      const data = await res.json()
      if (!res.ok) {
        addNotification(data.error?.replace(/_/g, ' ') ?? 'Failed', 'info')
      } else if (data.blocked) {
        addNotification('Target had a shield!', 'info')
      } else if (weaponType === 'shield') {
        addNotification('Shield activated!', 'info')
        setMatch((m) => ({
          ...m,
          playerStates: {
            ...m.playerStates,
            [currentUserId]: { ...m.playerStates[currentUserId], shield: true },
          },
        }))
      } else if (weaponType === 'nuke') {
        addNotification('NUKE launched!', 'incoming')
      } else {
        const targetName = match.players.find((p) => p.userId === targetId)?.username ?? 'target'
        addNotification(`${WEAPON_LABEL[weaponType]} fired at ${targetName}!`, 'info')
      }
    } catch {
      addNotification('Network error', 'info')
    } finally {
      setFiringWeapon(false)
      setSelectedTarget(null)
    }
  }

  function handleSubmit() {
    if (isOver || isFrozen) return
    startSubmit(async () => {
      setResult(null)
      try {
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: match.id, language, code }),
        })
        const data = (await res.json()) as SubmitResponse
        setResult(data)
        if (data.mirage) {
          addNotification('You were hit by a Mirage! That was a fake result.', 'incoming')
        }
      } catch {
        setResult({
          status: 'internal_error' as ExecutionStatus,
          testResults: [],
          testsPassed: 0,
          totalTests: 0,
          finished: false,
        })
      }
    })
  }

  const hasScreenLock = activeEffects.some(
    (e) => e.weaponType === 'screen_lock' && e.expiresAt > Date.now(),
  )
  const hasFreezeEffect = activeEffects.some(
    (e) => e.weaponType === 'freeze' && e.expiresAt > Date.now(),
  )
  const editorDisabled = isOver || isFrozen || hasFreezeEffect || myFinished

  const scoreboard = useMemo(() => buildScoreboard(match), [match])

  return (
    <main className="relative h-screen flex flex-col bg-background overflow-hidden">
      <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-3 border-b border-border/80 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center">
              <Swords className="size-3.5 text-background" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-sm hidden sm:inline">
              Code<span className="text-primary">Arena</span>
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          {isSpectator ? (
            <Badge variant="secondary" className="gap-1.5">
              <Eye className="size-3" />
              Spectating
            </Badge>
          ) : (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md border font-mono text-sm transition-all',
                ap > 0
                  ? 'border-arena-amber/40 bg-arena-amber/10 text-arena-amber shadow-glow-amber'
                  : 'border-border bg-muted/30 text-muted-foreground',
              )}
            >
              <Zap className="size-3.5" />
              <span className="font-semibold tabular-nums">{ap}</span>
              <span className="text-xs opacity-60">AP</span>
            </div>
          )}

          <TimerPill ms={timeRemainingMs} />

          {!isSpectator && myState?.shield && (
            <Badge variant="primary" className="gap-1 animate-pulse-glow">
              <Shield className="size-3" />
              Shield
            </Badge>
          )}

          {viewerCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-muted/30 text-muted-foreground text-xs font-mono"
              title={`${viewerCount} ${viewerCount === 1 ? 'viewer' : 'viewers'}`}
            >
              <Eye className="size-3" />
              <span className="tabular-nums">{viewerCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="font-mono gap-1.5">
            <span className="text-muted-foreground text-[10px]">ROOM</span>
            <span className="font-semibold tracking-widest">{match.roomCode}</span>
          </Badge>
        </div>
      </header>

      {!isSpectator && (
        <WeaponBar
          ap={ap}
          myState={myState}
          selectedTarget={selectedTarget}
          isOver={isOver}
          isFrozen={isFrozen || hasFreezeEffect}
          firingWeapon={firingWeapon}
          onFire={fireWeapon}
        />
      )}

      <div className="flex-1 flex min-h-0">
        <Sidebar
          scoreboard={scoreboard}
          currentUserId={currentUserId}
          selectedTarget={selectedTarget}
          onSelectTarget={(id) => setSelectedTarget((prev) => (prev === id ? null : id))}
          disableTargeting={isSpectator}
        />

        <section className="flex-1 border-r border-border/80 overflow-hidden flex flex-col min-w-0">
          <div className="px-8 pt-7 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant={DIFF_VARIANT[problem.difficulty] ?? 'default'}
                className="uppercase font-semibold"
              >
                {problem.difficulty}
              </Badge>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-1">{problem.title}</h1>
          </div>
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="prose prose-invert prose-sm max-w-none text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {problem.description}
            </div>
          </div>
        </section>

        <section className="w-[46%] flex flex-col min-h-0 relative bg-card/20">
          {isSpectator ? (
            <SpectatorPanel scoreboard={scoreboard} viewerCount={viewerCount} isOver={isOver} />
          ) : (
          <>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-card/40 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => {
                  const l = e.target.value as Language
                  setLanguage(l)
                  setCode(problem.starterCode[l])
                }}
                className="h-8 pl-3 pr-8 rounded-md bg-input border border-border text-xs font-medium focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-ring"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono hidden md:block">
                editor
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || editorDisabled}
              variant="primary"
              size="sm"
              className="min-w-[110px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Running…
                </>
              ) : isFrozen || hasFreezeEffect ? (
                <>
                  <Snowflake />
                  Frozen
                </>
              ) : myFinished ? (
                <>
                  <Check />
                  Done
                </>
              ) : (
                <>
                  <Play />
                  Submit
                </>
              )}
            </Button>
          </div>
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <div className="absolute inset-0">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                disabled={editorDisabled}
              />
            </div>
            {hasScreenLock && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-10 flex items-center justify-center animate-fade-in">
                <div className="text-center">
                  <div className="size-16 mx-auto mb-3 rounded-full bg-destructive/10 border border-destructive/30 grid place-items-center shadow-glow-rose">
                    <Lock className="size-7 text-destructive" />
                  </div>
                  <div className="font-display font-semibold text-lg">Screen Locked</div>
                  <div className="text-muted-foreground text-xs mt-1">Wait for it to wear off…</div>
                </div>
              </div>
            )}
            {hasFreezeEffect && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent z-10 flex items-center justify-center pointer-events-none animate-fade-in">
                <div className="text-center">
                  <div className="size-16 mx-auto mb-3 rounded-full bg-primary/15 border border-primary/40 grid place-items-center shadow-glow">
                    <Snowflake className="size-7 text-primary animate-pulse" />
                  </div>
                  <div className="font-display font-semibold text-lg text-primary text-glow-cyan">
                    Frozen
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">Editor disabled</div>
                </div>
              </div>
            )}
            {myFinished && !isOver && !hasFreezeEffect && !hasScreenLock && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 bg-arena-emerald/20 border border-arena-emerald/50 text-arena-emerald text-xs font-semibold backdrop-blur-md z-10">
                All tests passed — waiting for match to end
              </div>
            )}
          </div>
          {result && <ResultPanel result={result} />}
          </>
          )}
        </section>
      </div>

      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none w-80 max-w-[calc(100vw-2rem)]">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl backdrop-blur-md border animate-slide-in-right',
              n.type === 'incoming' &&
                'bg-destructive/90 border-destructive text-destructive-foreground ring-glow-rose',
              n.type === 'blocked' && 'bg-primary/90 border-primary text-primary-foreground',
              n.type === 'info' && 'bg-card/95 border-border text-foreground',
            )}
          >
            {n.type === 'incoming' && <Swords className="size-4 shrink-0" />}
            {n.type === 'blocked' && <Shield className="size-4 shrink-0" />}
            <span className="flex-1">{n.message}</span>
          </div>
        ))}
      </div>

      {isOver && (
        <EndOverlay
          match={match}
          placements={endPlacements ?? match.placements}
          eloDeltas={endEloDeltas}
          xpDeltas={endXpDeltas}
          myPlacement={myPlacement}
          currentUserId={currentUserId}
          isSpectator={isSpectator}
          onHome={() => router.push('/')}
        />
      )}
    </main>
  )
}

/* ─── Scoreboard helpers ─── */

type Row = {
  userId: string
  username: string
  avatarUrl: string | null
  testsPassed: number
  totalTests: number
  finishedAt: number | null
  ap: number
  hasShield: boolean
  frozen: boolean
}

function buildScoreboard(match: Match): Row[] {
  const rows: Row[] = match.players.map((p) => {
    const s = match.playerStates?.[p.userId]
    return {
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl ?? null,
      testsPassed: s?.testsPassed ?? 0,
      totalTests: s?.totalTests ?? 0,
      finishedAt: s?.finishedAt ?? null,
      ap: s?.ap ?? 0,
      hasShield: Boolean(s?.shield),
      frozen: (s?.frozenUntil ?? 0) > Date.now(),
    }
  })
  rows.sort((a, b) => {
    if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt
    if (a.finishedAt !== null) return -1
    if (b.finishedAt !== null) return 1
    return b.testsPassed - a.testsPassed
  })
  return rows
}

function Sidebar({
  scoreboard,
  currentUserId,
  selectedTarget,
  onSelectTarget,
  disableTargeting = false,
}: {
  scoreboard: Row[]
  currentUserId: string
  selectedTarget: string | null
  onSelectTarget: (id: string) => void
  disableTargeting?: boolean
}) {
  return (
    <aside className="w-60 shrink-0 border-r border-border/80 bg-card/20 backdrop-blur-sm flex flex-col">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <Trophy className="size-3.5 text-arena-amber" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
          Live Rank
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {scoreboard.map((row, idx) => {
          const me = row.userId === currentUserId
          const isTarget = row.userId === selectedTarget
          const pct = row.totalTests ? (row.testsPassed / row.totalTests) * 100 : 0
          const done = row.finishedAt !== null
          const clickable = !me && !disableTargeting
          return (
            <button
              key={row.userId}
              onClick={() => clickable && onSelectTarget(row.userId)}
              disabled={!clickable}
              className={cn(
                'w-full text-left rounded-lg border transition-all p-2.5',
                isTarget
                  ? 'bg-destructive/15 border-destructive/70 ring-glow-rose'
                  : done
                    ? 'bg-arena-emerald/10 border-arena-emerald/40'
                    : me
                      ? 'bg-primary/10 border-primary/40'
                      : clickable
                        ? 'bg-card/40 border-border hover:border-destructive/50 hover:bg-destructive/5 cursor-pointer'
                        : 'bg-card/40 border-border cursor-default',
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={cn(
                    'size-5 rounded-full grid place-items-center text-[10px] font-bold font-display shrink-0',
                    idx === 0
                      ? 'bg-arena-amber text-background'
                      : idx === 1
                        ? 'bg-muted-foreground/80 text-background'
                        : idx === 2
                          ? 'bg-arena-amber/60 text-background'
                          : 'bg-muted text-muted-foreground',
                  )}
                >
                  {idx + 1}
                </div>
                {row.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.avatarUrl}
                    alt=""
                    className="size-6 rounded-full bg-muted/40 border border-border shrink-0"
                  />
                ) : (
                  <div className="size-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-border grid place-items-center shrink-0">
                    <span className="text-[10px] font-bold font-display">
                      {row.username.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate flex items-center gap-1">
                    {row.username}
                    {me && <span className="text-muted-foreground">(you)</span>}
                    {row.hasShield && <Shield className="size-2.5 text-primary" />}
                    {row.frozen && <Snowflake className="size-2.5 text-primary animate-pulse" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono tabular-nums flex items-center gap-1.5">
                    <Zap className="size-2.5 text-arena-amber/80" />
                    {row.ap}
                    {done && (
                      <span className="text-arena-emerald ml-auto flex items-center gap-0.5">
                        <Check className="size-2.5" />
                        done
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      done
                        ? 'bg-gradient-to-r from-arena-emerald to-arena-emerald/70'
                        : 'bg-gradient-to-r from-primary to-secondary',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                  {row.testsPassed}/{row.totalTests}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function SpectatorPanel({
  scoreboard,
  viewerCount,
  isOver,
}: {
  scoreboard: Row[]
  viewerCount: number
  isOver: boolean
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Eye className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Spectator View
          </span>
        </div>
        {viewerCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {viewerCount} watching
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="text-center py-6">
          <div className="size-14 mx-auto mb-3 rounded-full bg-secondary/15 border border-secondary/40 grid place-items-center">
            <Eye className="size-6 text-secondary" />
          </div>
          <div className="font-display font-semibold text-lg">
            {isOver ? 'Match Ended' : 'Watching Live'}
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            {isOver ? 'Final standings on the left' : 'Follow players in real time'}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
            Players
          </div>
          {scoreboard.map((row, idx) => {
            const pct = row.totalTests ? (row.testsPassed / row.totalTests) * 100 : 0
            const done = row.finishedAt !== null
            return (
              <div
                key={row.userId}
                className={cn(
                  'rounded-lg border p-3',
                  done
                    ? 'bg-arena-emerald/10 border-arena-emerald/40'
                    : 'bg-card/40 border-border',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      'size-6 rounded-full grid place-items-center text-[11px] font-bold font-display shrink-0',
                      idx === 0
                        ? 'bg-arena-amber text-background'
                        : idx === 1
                          ? 'bg-muted-foreground/80 text-background'
                          : idx === 2
                            ? 'bg-arena-amber/60 text-background'
                            : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {idx + 1}
                  </div>
                  {row.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatarUrl}
                      alt=""
                      className="size-7 rounded-full bg-muted/40 border border-border shrink-0"
                    />
                  ) : (
                    <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-border grid place-items-center shrink-0">
                      <span className="text-xs font-bold font-display">
                        {row.username.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {row.username}
                      {row.hasShield && <Shield className="size-3 text-primary" />}
                      {row.frozen && <Snowflake className="size-3 text-primary animate-pulse" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono tabular-nums flex items-center gap-1.5">
                      <Zap className="size-2.5 text-arena-amber/80" />
                      {row.ap} AP
                      {done && (
                        <span className="text-arena-emerald ml-auto flex items-center gap-0.5">
                          <Check className="size-2.5" />
                          finished
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        done
                          ? 'bg-gradient-to-r from-arena-emerald to-arena-emerald/70'
                          : 'bg-gradient-to-r from-primary to-secondary',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
                    {row.testsPassed}/{row.totalTests}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TimerPill({ ms }: { ms: number }) {
  const low = ms < 60_000
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md border font-mono text-sm',
        low
          ? 'border-destructive/50 bg-destructive/10 text-destructive animate-pulse-glow'
          : 'border-border bg-muted/30 text-foreground',
      )}
    >
      <Clock className="size-3.5" />
      <span className="font-semibold tabular-nums">{formatMs(ms)}</span>
    </div>
  )
}

/* ─── Weapon Bar ─── */

function WeaponBar({
  ap,
  myState,
  selectedTarget,
  isOver,
  isFrozen,
  firingWeapon,
  onFire,
}: {
  ap: number
  myState: PlayerGameState | undefined
  selectedTarget: string | null
  isOver: boolean
  isFrozen: boolean
  firingWeapon: boolean
  onFire: (type: WeaponType) => void
}) {
  const now = Date.now()
  return (
    <div className="relative z-10 flex items-center gap-1.5 px-4 py-2 border-b border-border/80 bg-gradient-to-b from-card/40 to-background overflow-x-auto">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mr-2 hidden lg:block">
        Weapons
      </div>
      {(Object.entries(WEAPONS) as [WeaponType, (typeof WEAPONS)[WeaponType]][]).map(
        ([type, config]) => {
          const Icon = WEAPON_ICON[type]
          const isSelfTarget = type === 'shield' || type === 'time_warp'
          const isNuke = type === 'nuke'
          const needsTarget = !isSelfTarget && !isNuke
          const cooldownUntil = myState?.cooldowns[type] ?? 0
          const onCooldown = cooldownUntil > now
          const cooldownSec = onCooldown ? Math.ceil((cooldownUntil - now) / 1000) : 0
          const cantAfford = ap < config.cost
          const nukeUsed = isNuke && (myState?.nukeUsed ?? false)
          const noTarget = needsTarget && !selectedTarget
          const disabled =
            isOver || isFrozen || firingWeapon || cantAfford || onCooldown || nukeUsed || noTarget

          return (
            <button
              key={type}
              onClick={() => onFire(type)}
              disabled={disabled}
              title={`${config.description}\nCost: ${config.cost} AP${onCooldown ? `\nCooldown: ${cooldownSec}s` : ''}`}
              className={cn(
                'group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all whitespace-nowrap',
                disabled
                  ? 'border-border/60 bg-muted/20 text-muted-foreground/60 cursor-not-allowed'
                  : type === 'nuke'
                    ? 'border-arena-rose/40 bg-arena-rose/5 text-arena-rose hover:bg-arena-rose/10 hover:border-arena-rose/70 hover:shadow-glow-rose'
                    : isSelfTarget
                      ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/70 hover:shadow-glow-sm'
                      : 'border-border bg-card/40 text-foreground hover:bg-accent hover:border-primary/40 hover:text-primary',
              )}
            >
              <Icon className="size-3.5" />
              <span>{WEAPON_LABEL[type]}</span>
              <span
                className={cn(
                  'ml-1 px-1 rounded font-mono tabular-nums',
                  cantAfford ? 'text-destructive' : 'text-arena-amber',
                )}
              >
                {config.cost}
              </span>
              {onCooldown && (
                <span className="text-muted-foreground font-mono tabular-nums">{cooldownSec}s</span>
              )}
              {nukeUsed && <span className="text-muted-foreground">used</span>}
            </button>
          )
        },
      )}
      {!isOver && (
        <div className="ml-auto text-[11px] text-muted-foreground font-mono whitespace-nowrap pl-4">
          {selectedTarget ? '← pick a weapon' : '← click opponent in sidebar'}
        </div>
      )}
    </div>
  )
}

/* ─── Result Panel ─── */

function ResultPanel({ result }: { result: SubmitResponse }) {
  const allPassed = result.testsPassed === result.totalTests && result.totalTests > 0
  return (
    <div className="border-t border-border/80 bg-card/30 backdrop-blur-sm max-h-48 overflow-auto animate-fade-in-up">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allPassed ? (
            <div className="size-6 rounded-full bg-arena-emerald/15 border border-arena-emerald/40 grid place-items-center">
              <Check className="size-3.5 text-arena-emerald" />
            </div>
          ) : (
            <div className="size-6 rounded-full bg-destructive/15 border border-destructive/40 grid place-items-center">
              <X className="size-3.5 text-destructive" />
            </div>
          )}
          <span
            className={cn(
              'font-display font-semibold text-sm',
              allPassed ? 'text-arena-emerald' : 'text-destructive',
            )}
          >
            {result.testsPassed}/{result.totalTests} tests passed
          </span>
          {result.finished && (
            <Badge variant="emerald" className="ml-1">
              <Check className="size-3" />
              Finished
            </Badge>
          )}
          {result.mirage && (
            <Badge variant="secondary" className="ml-1">
              <Eye className="size-3" />
              Mirage
            </Badge>
          )}
        </div>
      </div>
      <div className="px-4 py-3 text-xs font-mono space-y-1 text-muted-foreground">
        {result.testResults.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground/60 w-16">Test {i + 1}</span>
            {t.passed ? (
              <span className="text-arena-emerald">
                passed <span className="text-muted-foreground/60">({t.timeSec ?? '?'}s)</span>
              </span>
            ) : (
              <span className="text-destructive">
                {t.status}
                {t.stderr && (
                  <span className="text-muted-foreground"> — {t.stderr.slice(0, 120)}</span>
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── End Overlay ─── */

type H2HRecord = { wins: number; losses: number; matches: number }
type FriendshipState = {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  iRequested: boolean
}

function EndOverlay({
  match,
  placements,
  eloDeltas,
  xpDeltas,
  myPlacement,
  currentUserId,
  isSpectator,
  onHome,
}: {
  match: Match
  placements: Placement[]
  eloDeltas: Record<string, number>
  xpDeltas: Record<string, number>
  myPlacement: number | null
  currentUserId: string
  isSpectator: boolean
  onHome: () => void
}) {
  const router = useRouter()
  const nameById = new Map(match.players.map((p) => [p.userId, p.username]))
  const avatarById = new Map(match.players.map((p) => [p.userId, p.avatarUrl ?? null]))
  const didWin = myPlacement === 1

  const [h2h, setH2H] = useState<Record<string, H2HRecord>>({})
  const [friendships, setFriendships] = useState<Record<string, FriendshipState>>({})
  const [rematching, setRematching] = useState(false)
  const [rematchError, setRematchError] = useState<string | null>(null)

  const opponentIds = useMemo(
    () =>
      placements
        .map((p) => p.userId)
        .filter((id) => id !== currentUserId),
    [placements, currentUserId],
  )

  useEffect(() => {
    if (!opponentIds.length || isSpectator) return
    let cancelled = false
    ;(async () => {
      const res = await fetch(
        `/api/rivalry?opponents=${opponentIds.join(',')}`,
      )
      if (!res.ok || cancelled) return
      const data = await res.json()
      setH2H(data.records ?? {})
      setFriendships(data.friendships ?? {})
    })()
    return () => {
      cancelled = true
    }
  }, [opponentIds, isSpectator])

  async function addFriend(opponentId: string, username: string) {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (!res.ok) return
    const data = await res.json()
    setFriendships((prev) => ({
      ...prev,
      [opponentId]: {
        id: data.id,
        status: data.status ?? 'pending',
        iRequested: true,
      },
    }))
  }

  async function rematch() {
    setRematchError(null)
    setRematching(true)
    try {
      const res = await fetch('/api/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponentIds }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to create rematch')
      }
      const { room } = await res.json()
      router.push(`/room/${room.code}`)
    } catch (e) {
      setRematchError((e as Error).message)
      setRematching(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-6">
      <div className="relative max-w-lg w-full animate-fade-in-up">
        <div
          className={cn(
            'absolute -inset-8 blur-3xl opacity-60 rounded-full',
            didWin
              ? 'bg-gradient-to-r from-primary via-arena-amber to-secondary'
              : 'bg-gradient-to-r from-arena-violet to-secondary',
          )}
        />
        <div className="relative rounded-2xl border border-border bg-card/90 backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                'size-14 rounded-full grid place-items-center shadow-lg',
                didWin
                  ? 'bg-gradient-to-br from-primary to-arena-amber'
                  : 'bg-gradient-to-br from-arena-violet to-secondary',
              )}
            >
              {didWin ? (
                <Crown className="size-7 text-background" strokeWidth={2.5} />
              ) : (
                <Trophy className="size-7 text-background" strokeWidth={2.5} />
              )}
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Match ended
          </div>
          <h2 className="font-display text-3xl font-bold mb-5 tracking-tight">
            {isSpectator ? (
              <span className="text-foreground">Match complete</span>
            ) : didWin ? (
              <span className="bg-gradient-to-r from-primary via-arena-amber to-secondary bg-clip-text text-transparent">
                Victory
              </span>
            ) : myPlacement ? (
              <span className="text-foreground">
                You finished #{myPlacement}
              </span>
            ) : (
              <span className="text-foreground">Match complete</span>
            )}
          </h2>

          <ul className="space-y-2 mb-6 text-left">
            {placements.map((p) => {
              const delta = eloDeltas[p.userId] ?? 0
              const xpDelta = xpDeltas[p.userId] ?? 0
              const me = p.userId === currentUserId
              return (
                <li
                  key={p.userId}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2',
                    me ? 'bg-primary/10 border-primary/40' : 'bg-card/60 border-border',
                  )}
                >
                  <div
                    className={cn(
                      'size-7 rounded-full grid place-items-center text-xs font-bold font-display',
                      p.placement === 1
                        ? 'bg-arena-amber text-background'
                        : p.placement === 2
                          ? 'bg-muted-foreground/80 text-background'
                          : p.placement === 3
                            ? 'bg-arena-amber/60 text-background'
                            : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {p.placement}
                  </div>
                  {avatarById.get(p.userId) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarById.get(p.userId)!}
                      alt=""
                      className="size-7 rounded-full bg-muted/40 border border-border"
                    />
                  ) : (
                    <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-border grid place-items-center">
                      <span className="text-xs font-bold font-display">
                        {(nameById.get(p.userId) ?? '?').slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {nameById.get(p.userId) ?? 'Unknown'}
                      {me && <span className="text-muted-foreground ml-1">(you)</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                      <span>
                        {p.testsPassed}/{match.playerStates?.[p.userId]?.totalTests ?? 0} tests
                        {p.finishedAt && ' · finished'}
                      </span>
                      {!me && h2h[p.userId] && h2h[p.userId].matches > 0 && (
                        <H2HBadge record={h2h[p.userId]} />
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-xs tabular-nums text-right">
                    <div
                      className={cn(
                        delta > 0
                          ? 'text-arena-emerald'
                          : delta < 0
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                      )}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta} ELO
                    </div>
                    {xpDelta > 0 && (
                      <div className="text-arena-amber">+{xpDelta} XP</div>
                    )}
                  </div>
                  {!me && !isSpectator && (
                    <EndFriendAction
                      opponentId={p.userId}
                      username={nameById.get(p.userId) ?? ''}
                      state={friendships[p.userId]}
                      onAdd={() =>
                        addFriend(p.userId, nameById.get(p.userId) ?? '')
                      }
                    />
                  )}
                </li>
              )
            })}
          </ul>

          {rematchError && (
            <p className="mb-3 text-xs text-destructive text-center">{rematchError}</p>
          )}

          <div className="flex gap-2">
            {opponentIds.length > 0 && !isSpectator && (
              <Button
                onClick={rematch}
                disabled={rematching}
                variant="primary"
                size="lg"
                className="flex-1"
              >
                {rematching ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                Rematch
              </Button>
            )}
            <Button
              onClick={onHome}
              variant={opponentIds.length > 0 && !isSpectator ? 'outline' : 'primary'}
              size="lg"
              className="flex-1"
            >
              <Home />
              Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function H2HBadge({ record }: { record: H2HRecord }) {
  const dominant = record.wins > record.losses
  const even = record.wins === record.losses
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
        even
          ? 'bg-muted/40 text-muted-foreground'
          : dominant
            ? 'bg-arena-emerald/10 text-arena-emerald'
            : 'bg-destructive/10 text-destructive',
      )}
      title={`${record.matches} previous ${record.matches === 1 ? 'match' : 'matches'}`}
    >
      <Flame className="size-2.5" />
      {record.wins}-{record.losses}
    </span>
  )
}

function EndFriendAction({
  opponentId: _opponentId,
  username,
  state,
  onAdd,
}: {
  opponentId: string
  username: string
  state: FriendshipState | undefined
  onAdd: () => void
}) {
  if (!username) return null
  if (state?.status === 'accepted') {
    return (
      <span className="text-[10px] text-arena-emerald font-semibold uppercase tracking-wider">
        Friend
      </span>
    )
  }
  if (state?.status === 'pending') {
    return (
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        {state.iRequested ? 'Requested' : 'Pending'}
      </span>
    )
  }
  return (
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 text-primary px-2 py-1 text-[10px] font-semibold hover:bg-primary/20 transition-colors"
      title="Add as friend"
    >
      <UserPlus className="size-3" />
      Add
    </button>
  )
}
