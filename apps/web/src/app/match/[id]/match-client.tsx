'use client'

import { useEffect, useState, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import {
  Bomb,
  Check,
  Clock,
  Crown,
  Eye,
  Home,
  Loader2,
  Lock,
  Play,
  Radiation,
  Shield,
  Shuffle,
  Snowflake,
  Swords,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type SubmitResponse = {
  status: ExecutionStatus
  testResults: TestResult[]
  isFirstSolve: boolean
  isWinner: boolean
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
  const notifIdRef = useRef(0)
  const codeRef = useRef(code)
  codeRef.current = code

  const myState: PlayerGameState | undefined = match.playerStates?.[currentUserId]
  const ap = myState?.ap ?? 0
  const isOver = match.status === 'finished'
  const didWin = match.winnerId === currentUserId
  const winnerName = match.players.find((p) => p.userId === match.winnerId)?.username ?? null
  const isFrozen = (myState?.frozenUntil ?? 0) > Date.now()

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

      socket.on('player:solved', ({ userId }: { userId: string }) => {
        setMatch((m) =>
          m.solvers.includes(userId) ? m : { ...m, solvers: [...m.solvers, userId] },
        )
      })

      socket.on('game:end', ({ winnerId }: { winnerId: string }) => {
        setMatch((m) => ({
          ...m,
          status: 'finished',
          winnerId,
          endedAt: Date.now(),
        }))
      })

      socket.on('weapon:incoming', ({ weaponType, attackerId, attackerUsername, targetId, duration }: {
        weaponType: WeaponType
        attackerId: string
        attackerUsername: string
        targetId: string
        duration: number
      }) => {
        if (targetId !== currentUserId) {
          const targetName = match.players.find((p) => p.userId === targetId)?.username ?? 'Someone'
          addNotification(`${attackerUsername} used ${WEAPON_LABEL[weaponType]} on ${targetName}`, 'info')
          return
        }
        addNotification(`${attackerUsername} hit you with ${WEAPON_LABEL[weaponType]}!`, 'incoming')
        applyClientEffect(weaponType, duration)
      })

      socket.on('weapon:blocked', ({ weaponType, attackerId, targetId }: {
        weaponType: WeaponType
        attackerId: string
        targetId: string
      }) => {
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
      })

      socket.on('player:ap_update', ({ userId, ap: newAp }: { userId: string; ap: number }) => {
        setMatch((m) => ({
          ...m,
          playerStates: {
            ...m.playerStates,
            [userId]: { ...m.playerStates[userId], ap: newAp },
          },
        }))
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
        setActiveEffects((prev) => [...prev, { weaponType: 'freeze', attackerUsername: '', expiresAt }])
        setMatch((m) => ({
          ...m,
          playerStates: {
            ...m.playerStates,
            [currentUserId]: { ...m.playerStates[currentUserId], frozen: true, frozenUntil: expiresAt },
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
        setActiveEffects((prev) => [...prev, { weaponType: 'screen_lock', attackerUsername: '', expiresAt }])
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
          status: 'internal_error',
          testResults: [],
          isFirstSolve: false,
          isWinner: false,
        })
      }
    })
  }

  const hasScreenLock = activeEffects.some((e) => e.weaponType === 'screen_lock' && e.expiresAt > Date.now())
  const hasFreezeEffect = activeEffects.some((e) => e.weaponType === 'freeze' && e.expiresAt > Date.now())
  const editorDisabled = isOver || isFrozen || hasFreezeEffect

  return (
    <main className="relative h-screen flex flex-col bg-background overflow-hidden">
      {/* Top HUD */}
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

          {/* AP counter */}
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

          {myState?.shield && (
            <Badge variant="primary" className="gap-1 animate-pulse-glow">
              <Shield className="size-3" />
              Shield
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className="font-mono gap-1.5">
            <span className="text-muted-foreground text-[10px]">ROOM</span>
            <span className="font-semibold tracking-widest">{match.roomCode}</span>
          </Badge>
          <PlayerPills
            match={match}
            currentUserId={currentUserId}
            selectedTarget={selectedTarget}
            onSelectTarget={(id) => setSelectedTarget((prev) => (prev === id ? null : id))}
          />
        </div>
      </header>

      {/* Weapon bar */}
      <WeaponBar
        ap={ap}
        myState={myState}
        selectedTarget={selectedTarget}
        isOver={isOver}
        isFrozen={isFrozen || hasFreezeEffect}
        firingWeapon={firingWeapon}
        onFire={fireWeapon}
      />

      {/* Main split */}
      <div className="flex-1 flex min-h-0">
        {/* Problem panel */}
        <section className="w-1/2 border-r border-border/80 overflow-hidden flex flex-col">
          <div className="px-8 pt-7 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={DIFF_VARIANT[problem.difficulty] ?? 'default'} className="uppercase font-semibold">
                {problem.difficulty}
              </Badge>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-1">
              {problem.title}
            </h1>
          </div>
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="prose prose-invert prose-sm max-w-none text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {problem.description}
            </div>
          </div>
        </section>

        {/* Editor panel */}
        <section className="w-1/2 flex flex-col min-h-0 relative bg-card/20">
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
              ) : (
                <>
                  <Play />
                  Submit
                </>
              )}
            </Button>
          </div>
          <div className="relative flex-1">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={editorDisabled}
              spellCheck={false}
              className="absolute inset-0 px-5 py-4 bg-transparent text-sm font-mono leading-relaxed resize-none focus:outline-none disabled:opacity-60 selection:bg-primary/30"
            />
            {/* Screen Lock overlay */}
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
            {/* Freeze overlay */}
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
          </div>
          {result && <ResultPanel result={result} />}
        </section>
      </div>

      {/* Notifications */}
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

      {/* Match end overlay */}
      {isOver && <EndOverlay didWin={didWin} winnerName={winnerName} onHome={() => router.push('/')} />}
    </main>
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
          {selectedTarget ? '← pick a weapon' : '← click opponent to target'}
        </div>
      )}
    </div>
  )
}

/* ─── Player Pills ─── */

function PlayerPills({
  match,
  currentUserId,
  selectedTarget,
  onSelectTarget,
}: {
  match: Match
  currentUserId: string
  selectedTarget: string | null
  onSelectTarget: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {match.players.map((p) => {
        const solved = match.solvers.includes(p.userId)
        const me = p.userId === currentUserId
        const isTarget = p.userId === selectedTarget
        const playerAp = match.playerStates?.[p.userId]?.ap ?? 0
        const hasShield = match.playerStates?.[p.userId]?.shield ?? false
        return (
          <button
            key={p.userId}
            onClick={() => !me && onSelectTarget(p.userId)}
            disabled={me}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all',
              isTarget && 'bg-destructive/15 border-destructive/70 text-destructive ring-glow-rose',
              !isTarget && solved && 'bg-arena-emerald/10 border-arena-emerald/40 text-arena-emerald',
              !isTarget && !solved && me && 'bg-primary/10 border-primary/40 text-primary',
              !isTarget &&
                !solved &&
                !me &&
                'bg-card/40 border-border text-foreground hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive cursor-pointer',
            )}
          >
            {hasShield && <Shield className="size-3" />}
            <span className="font-medium">{p.username}</span>
            {me && <span className="opacity-60">(you)</span>}
            {solved && <Check className="size-3" />}
            {!me && (
              <span className="flex items-center gap-0.5 text-arena-amber/80 font-mono tabular-nums">
                <Zap className="size-2.5" />
                {playerAp}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Result Panel ─── */

function ResultPanel({ result }: { result: SubmitResponse }) {
  const ok = result.status === 'accepted'
  return (
    <div className="border-t border-border/80 bg-card/30 backdrop-blur-sm max-h-48 overflow-auto animate-fade-in-up">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ok ? (
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
              ok ? 'text-arena-emerald' : 'text-destructive',
            )}
          >
            {result.status.replace(/_/g, ' ').toUpperCase()}
          </span>
          {result.isWinner && (
            <Badge variant="amber" className="ml-1">
              <Crown className="size-3" />
              You won
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

function EndOverlay({
  didWin,
  winnerName,
  onHome,
}: {
  didWin: boolean
  winnerName: string | null
  onHome: () => void
}) {
  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-6">
      <div className="relative max-w-md w-full animate-fade-in-up">
        {/* glow halo */}
        <div
          className={cn(
            'absolute -inset-8 blur-3xl opacity-60 rounded-full',
            didWin
              ? 'bg-gradient-to-r from-primary via-arena-amber to-secondary'
              : 'bg-gradient-to-r from-destructive to-arena-violet',
          )}
        />
        <div className="relative rounded-2xl border border-border bg-card/90 backdrop-blur-xl p-10 text-center shadow-2xl">
          <div className="flex justify-center mb-5">
            <div
              className={cn(
                'size-16 rounded-full grid place-items-center shadow-lg',
                didWin
                  ? 'bg-gradient-to-br from-primary to-arena-amber'
                  : 'bg-gradient-to-br from-destructive to-arena-violet',
              )}
            >
              {didWin ? (
                <Crown className="size-8 text-background" strokeWidth={2.5} />
              ) : (
                <Swords className="size-7 text-background" strokeWidth={2.5} />
              )}
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Match ended
          </div>
          <h2 className="font-display text-4xl font-bold mb-3 tracking-tight">
            {didWin ? (
              <span className="bg-gradient-to-r from-primary via-arena-amber to-secondary bg-clip-text text-transparent">
                Victory
              </span>
            ) : (
              <span className="text-foreground">{winnerName ?? 'Someone'} won</span>
            )}
          </h2>
          <p className="text-muted-foreground text-sm mb-7">
            {didWin
              ? 'First to pass all tests. Nice work.'
              : 'They solved it first. Rematch?'}
          </p>
          <Button onClick={onHome} variant="primary" size="lg" className="w-full">
            <Home />
            Back to home
          </Button>
        </div>
      </div>
    </div>
  )
}
