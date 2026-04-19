import jwt from 'jsonwebtoken'

export type ArenaTokenPayload = {
  userId: string
  username: string
}

export function verifyArenaToken(token: string): ArenaTokenPayload {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload
  return { userId: String(decoded.userId), username: String(decoded.username) }
}
