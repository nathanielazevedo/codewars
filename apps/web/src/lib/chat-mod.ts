import { checkRateLimit, type RateLimitResult } from './rate-limit'

const BAD_WORDS = [
  'fuck',
  'fucking',
  'fucker',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'dick',
  'pussy',
  'fag',
  'faggot',
  'nigger',
  'nigga',
  'retard',
  'retarded',
  'whore',
  'slut',
  'kys',
]

const BAD_WORD_RE = new RegExp(`\\b(?:${BAD_WORDS.join('|')})\\b`, 'gi')

export function censorProfanity(text: string): string {
  return text.replace(BAD_WORD_RE, (m) => '*'.repeat(m.length))
}

export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit('chat', userId)
}
