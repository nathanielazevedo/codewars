import { auth } from '@/auth'
import { db } from '@code-arena/db'
import {
  CHAT_MESSAGE_MAX_LENGTH,
  getChatHistory,
  postChatMessage,
} from '@/lib/rooms'
import { checkChatRateLimit } from '@/lib/chat-mod'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const { code } = await params
  const messages = await getChatHistory(code.toUpperCase())
  return NextResponse.json({ messages })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { text } = await req.json().catch(() => ({}))
  if (typeof text !== 'string') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }
  if (!text.trim()) {
    return NextResponse.json({ error: 'EMPTY' }, { status: 400 })
  }
  if (text.length > CHAT_MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ error: 'TOO_LONG' }, { status: 400 })
  }

  const rl = await checkChatRateLimit(session.user.id)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { code } = await params
  const sender = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, avatarUrl: true },
  })
  if (!sender) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  try {
    const message = await postChatMessage(
      code.toUpperCase(),
      { userId: sender.id, username: sender.username, avatarUrl: sender.avatarUrl },
      text,
    )
    return NextResponse.json({ message })
  } catch (e) {
    const msg = (e as Error).message
    const status = msg === 'ROOM_NOT_FOUND' ? 404 : msg === 'NOT_IN_ROOM' ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
