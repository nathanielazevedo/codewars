import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import { db } from '@code-arena/db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      elo: number
      rankTier: string
      isAdmin: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    username: string
    elo: number
    rankTier: string
    isAdmin: boolean
  }
}

function deriveUsername(profile: Record<string, unknown>): string {
  const raw =
    (profile.login as string | undefined) ??
    (profile.name as string | undefined)?.replace(/\s+/g, '').toLowerCase() ??
    (profile.email as string | undefined)?.split('@')[0] ??
    'player'
  return raw.slice(0, 32)
}

const isDev = process.env.NODE_ENV === 'development'

const providers = [
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  }),
]

if (isDev) {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev',
      credentials: {
        username: { label: 'Username', type: 'text' },
      },
      async authorize(credentials) {
        const raw = String(credentials?.username ?? '').trim().toLowerCase()
        if (!/^[a-z0-9_]{2,20}$/.test(raw)) return null

        const user = await db.user.upsert({
          where: { provider_providerId: { provider: 'dev', providerId: raw } },
          create: {
            provider: 'dev',
            providerId: raw,
            email: `${raw}@dev.local`,
            username: raw,
            avatarUrl: null,
          },
          update: {},
        })

        return { id: user.id, email: user.email, name: user.username }
      },
    }) as unknown as (typeof providers)[number],
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/signin' },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account) return false

      // Dev provider: user already upserted in authorize()
      if (account.provider === 'dev') return true

      // OAuth providers: upsert here
      if (!profile) return false
      const p = profile as Record<string, unknown>
      const email = p.email as string | undefined
      if (!email) return false

      const providerId = String(p.sub ?? p.id)
      const avatarUrl = (p.picture as string) ?? (p.avatar_url as string) ?? null

      await db.user.upsert({
        where: { provider_providerId: { provider: account.provider, providerId } },
        create: {
          provider: account.provider,
          providerId,
          email,
          username: deriveUsername(p),
          avatarUrl,
        },
        update: { avatarUrl },
      })
      return true
    },
    async jwt({ token, account, profile, user }) {
      if (!account) return token

      let userId: string | undefined
      if (account.provider === 'dev' && user?.id) {
        userId = user.id
      } else if (profile) {
        const p = profile as Record<string, unknown>
        const providerId = String(p.sub ?? p.id)
        const dbUser = await db.user.findUnique({
          where: { provider_providerId: { provider: account.provider, providerId } },
        })
        userId = dbUser?.id
      }

      if (userId) {
        const dbUser = await db.user.findUnique({ where: { id: userId } })
        if (dbUser) {
          token.userId = dbUser.id
          token.username = dbUser.username
          token.elo = dbUser.elo
          token.rankTier = dbUser.rankTier
          token.isAdmin = dbUser.isAdmin
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId
        session.user.username = token.username
        session.user.elo = token.elo
        session.user.rankTier = token.rankTier
        session.user.isAdmin = token.isAdmin ?? false
      }
      return session
    },
  },
})
