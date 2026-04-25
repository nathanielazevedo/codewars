import { auth } from '@/auth'
import { db } from '@code-arena/db'
import {
  QUEUE_CHAT_MAX_LENGTH,
  getQuickmatchChat,
  postQuickmatchChat,
} from '@/lib/queue'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const messages = await getQuickmatchChat()
  return NextResponse.json({ messages })
}

export async function POST(req: Request) {
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
  if (text.length > QUEUE_CHAT_MAX_LENGTH) {
    return NextResponse.json({ error: 'TOO_LONG' }, { status: 400 })
  }

  const sender = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, avatarUrl: true },
  })
  if (!sender) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  try {
    const message = await postQuickmatchChat(
      { userId: sender.id, username: sender.username, avatarUrl: sender.avatarUrl },
      text,
    )
    return NextResponse.json({ message })
  } catch (e) {
    const msg = (e as Error).message
    const status = msg === 'NOT_IN_QUEUE' ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
