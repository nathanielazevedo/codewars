import { Redis } from 'ioredis'

const url = process.env.REDIS_URL ?? 'redis://localhost:6379'

// family: 0 = allow both IPv4 and IPv6 (Railway's private network is IPv6-only)
export const redis = new Redis(url, { family: 0 })
export const redisSub = new Redis(url, { family: 0 })
