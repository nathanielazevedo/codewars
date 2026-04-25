'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'

export type ChatMessageView = {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  text: string
  sentAt: number
}

export const CHAT_MAX = 280

export function ChatPanel({
  title = 'Trash talk',
  subtitle,
  emptyHint = 'No messages yet. Start the smack talk.',
  currentUserId,
  messages,
  onSend,
  placeholder = 'Say something…',
  height = 'h-48',
}: {
  title?: string
  subtitle?: string
  emptyHint?: string
  currentUserId: string
  messages: ChatMessageView[]
  onSend: (text: string) => Promise<void>
  placeholder?: string
  height?: string
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  async function send() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setErr(null)
    try {
      await onSend(trimmed)
      setText('')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm">{title}</h3>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className={`${height} overflow-y-auto rounded-lg border border-border/50 bg-background/40 p-3 space-y-2 text-sm`}
      >
        {messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground pt-14">{emptyHint}</div>
        ) : (
          messages.map((m) => {
            const mine = m.userId === currentUserId
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                {m.avatarUrl ? (
                  <img
                    src={m.avatarUrl}
                    alt=""
                    className="size-6 rounded-full shrink-0 object-cover"
                  />
                ) : (
                  <div className="size-6 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 grid place-items-center text-[10px] font-bold shrink-0">
                    {m.username[0]?.toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-2.5 py-1.5 ${
                    mine
                      ? 'bg-primary/15 border border-primary/30'
                      : 'bg-card/80 border border-border/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {mine ? 'you' : m.username}
                    </span>
                  </div>
                  <div className="leading-snug break-words whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={text}
          maxLength={CHAT_MAX}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  )
}
