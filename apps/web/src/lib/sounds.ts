'use client'

export type SoundName =
  | 'weapon-hit'
  | 'weapon-fire'
  | 'solved'
  | 'opponent-solved'
  | 'timer-warning'

const SOUND_FILES: Record<SoundName, string> = {
  'weapon-hit': '/sounds/weapon-hit.mp3',
  'weapon-fire': '/sounds/weapon-fire.mp3',
  solved: '/sounds/solved.mp3',
  'opponent-solved': '/sounds/opponent-solved.mp3',
  'timer-warning': '/sounds/timer-warning.mp3',
}

const VOLUMES: Record<SoundName, number> = {
  'weapon-hit': 0.6,
  'weapon-fire': 0.4,
  solved: 0.5,
  'opponent-solved': 0.3,
  'timer-warning': 0.5,
}

const STORAGE_KEY = 'codearena.soundMuted'

const cache = new Map<SoundName, HTMLAudioElement>()
let mutedCached: boolean | null = null

export function isMuted(): boolean {
  if (mutedCached !== null) return mutedCached
  if (typeof window === 'undefined') return true
  const v = window.localStorage.getItem(STORAGE_KEY)
  mutedCached = v === null ? true : v === '1'
  return mutedCached
}

export function setMuted(v: boolean): void {
  mutedCached = v
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  }
}

export function preloadSounds(): void {
  if (typeof window === 'undefined') return
  for (const name of Object.keys(SOUND_FILES) as SoundName[]) {
    if (cache.has(name)) continue
    const a = new Audio(SOUND_FILES[name])
    a.preload = 'auto'
    a.volume = VOLUMES[name]
    cache.set(name, a)
  }
}

export function playSound(name: SoundName): void {
  if (typeof window === 'undefined') return
  if (isMuted()) return
  const base = cache.get(name)
  if (!base) return
  const clone = base.cloneNode() as HTMLAudioElement
  clone.volume = VOLUMES[name]
  clone.play().catch(() => {
    /* autoplay blocked, file missing, or user hasn't interacted yet */
  })
}
