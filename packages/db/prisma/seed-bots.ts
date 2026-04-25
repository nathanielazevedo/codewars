import { db } from '../src/index'

type BotPersona = 'rookie' | 'contender' | 'ace'

type BotSeed = {
  username: string
  persona: BotPersona
  elo: number
  bio: string
}

const rookies: BotSeed[] = [
  { username: 'neonviper', persona: 'rookie', elo: 980, bio: 'learning recursion the hard way' },
  { username: 'pixelhawk', persona: 'rookie', elo: 1040, bio: 'leetcode easy enjoyer' },
  { username: 'codefrog', persona: 'rookie', elo: 900, bio: 'ribbit — still reading the prompt' },
  { username: 'greenbyte', persona: 'rookie', elo: 1110, bio: 'bootcamp grad, trying my best' },
  { username: 'loopling', persona: 'rookie', elo: 820, bio: 'off-by-one lifer' },
  { username: 'slopez42', persona: 'rookie', elo: 1180, bio: 'copy paste CS student' },
  { username: 'nullmancer', persona: 'rookie', elo: 1020, bio: 'my code works sometimes' },
  { username: 'stevepogger', persona: 'rookie', elo: 960, bio: 'just here for the dopamine' },
]

const contenders: BotSeed[] = [
  { username: 'quantumdrift', persona: 'contender', elo: 1480, bio: 'coffee driven development' },
  { username: 'nightbyte', persona: 'contender', elo: 1620, bio: 'O(n log n) gang' },
  { username: 'sigma_ray', persona: 'contender', elo: 1340, bio: 'solving in JS, judging you in python' },
  { username: 'vaporwave', persona: 'contender', elo: 1550, bio: 'synth + segfaults' },
  { username: 'recursia', persona: 'contender', elo: 1710, bio: 'my base case is love' },
  { username: 'hexwitch', persona: 'contender', elo: 1460, bio: 'casting memoization spells' },
  { username: 'kernelpanic', persona: 'contender', elo: 1380, bio: 'daily user of gdb' },
  { username: 'boolzilla', persona: 'contender', elo: 1580, bio: 'bitmask enjoyer' },
  { username: 'draftpunk', persona: 'contender', elo: 1660, bio: 'harder, better, faster, O(1)er' },
  { username: 'ohmfist', persona: 'contender', elo: 1510, bio: 'rage quit enthusiast' },
]

const aces: BotSeed[] = [
  { username: 'voidshard', persona: 'ace', elo: 2140, bio: 'two-sum in one breath' },
  { username: 'archon0x', persona: 'ace', elo: 2320, bio: 'former ICPC regional' },
  { username: 'zeroday', persona: 'ace', elo: 2050, bio: 'see you in finals' },
  { username: 'inverseblu', persona: 'ace', elo: 2270, bio: 'dp is just recursion that eats' },
  { username: 'graphgoblin', persona: 'ace', elo: 1960, bio: 'dijkstra apologist' },
  { username: 'cortanova', persona: 'ace', elo: 2410, bio: 'rating inflation blaming enjoyer' },
  { username: 'astrabyte', persona: 'ace', elo: 2180, bio: 'reads editorials for fun' },
  { username: 'omegaforge', persona: 'ace', elo: 2280, bio: 'segfaults are a lifestyle' },
]

const ALL_BOTS: BotSeed[] = [...rookies, ...contenders, ...aces]

function tierFor(elo: number): string {
  if (elo < 1100) return 'bronze'
  if (elo < 1400) return 'silver'
  if (elo < 1700) return 'gold'
  if (elo < 2000) return 'platinum'
  if (elo < 2300) return 'diamond'
  return 'master'
}

function avatarUrl(username: string): string {
  // DiceBear avatars — stable per-seed, free, no auth.
  // Mixing styles to make the roster feel varied.
  const styles = ['bottts-neutral', 'adventurer-neutral', 'avataaars-neutral', 'thumbs']
  const style = styles[Math.abs(hash(username)) % styles.length]
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(username)}`
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}

async function main() {
  for (const bot of ALL_BOTS) {
    await db.user.upsert({
      where: { provider_providerId: { provider: 'bot', providerId: bot.username } },
      create: {
        provider: 'bot',
        providerId: bot.username,
        username: bot.username,
        email: `${bot.username}@bots.codearena.local`,
        avatarUrl: avatarUrl(bot.username),
        elo: bot.elo,
        rankTier: tierFor(bot.elo),
        bio: bot.bio,
        isBot: true,
        botPersona: bot.persona,
      },
      update: {
        avatarUrl: avatarUrl(bot.username),
        elo: bot.elo,
        rankTier: tierFor(bot.elo),
        bio: bot.bio,
        isBot: true,
        botPersona: bot.persona,
      },
    })
  }

  const counts = await db.user.groupBy({ by: ['botPersona'], _count: true, where: { isBot: true } })
  console.log('Seeded bots:', counts)
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    return db.$disconnect().then(() => process.exit(1))
  })
