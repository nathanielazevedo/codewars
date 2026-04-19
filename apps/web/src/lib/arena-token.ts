import jwt from 'jsonwebtoken'

export type ArenaTokenPayload = {
  userId: string
  username: string
}

export function signArenaToken(payload: ArenaTokenPayload): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '15m' })
}
