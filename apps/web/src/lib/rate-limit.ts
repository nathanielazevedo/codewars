import { NextResponse } from 'next/server'
import { redis } from './redis'

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

export const RATE_LIMITS = {
  chat: { windowSec: 10, max: 5 },
  submit: { windowSec: 30, max: 10 },
  weapon: { windowSec: 10, max: 10 },
  room: { windowSec: 60, max: 5 },
  friend: { windowSec: 60, max: 10 },
  queue: { windowSec: 30, max: 10 },
} as const

export type RateLimitScope = keyof typeof RATE_LIMITS

export async function checkRateLimit(
  scope: RateLimitScope,
  userId: string,
): Promise<RateLimitResult> {
  const { windowSec, max } = RATE_LIMITS[scope]
  const key = `rl:${scope}:${userId}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, windowSec)
  }
  if (count > max) {
    const ttl = await redis.ttl(key)
    return { ok: false, retryAfterSec: Math.max(1, ttl) }
  }
  return { ok: true }
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'RATE_LIMITED', retryAfterSec },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  )
}
