import jwt from 'jsonwebtoken'

export type ArenaTokenPayload = {
  userId: string
  username: string
}

const DEFAULT_DEV_SECRET = 'dev-secret-change-me'

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  if (process.env.NODE_ENV === 'production' && secret === DEFAULT_DEV_SECRET) {
    throw new Error('NEXTAUTH_SECRET must be set to a non-default value in production')
  }
  return secret
}

export function signArenaToken(payload: ArenaTokenPayload): string {
  return jwt.sign(payload, getSecret(), { algorithm: 'HS256', expiresIn: '15m' })
}
