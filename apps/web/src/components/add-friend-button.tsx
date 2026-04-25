'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Check, X, UserMinus, Loader2 } from 'lucide-react'

export type Relationship = 'none' | 'incoming' | 'outgoing' | 'friends'

export function AddFriendButton({
  targetUsername,
  initialRelationship,
  initialFriendshipId,
}: {
  targetUsername: string
  initialRelationship: Relationship
  initialFriendshipId: string | null
}) {
  const router = useRouter()
  const [rel, setRel] = useState<Relationship>(initialRelationship)
  const [friendshipId, setFriendshipId] = useState<string | null>(initialFriendshipId)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  async function sendRequest() {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: targetUsername }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Failed to send request')
    setFriendshipId(data.id ?? null)
    setRel(data.status === 'accepted' ? 'friends' : 'outgoing')
  }

  async function accept() {
    if (!friendshipId) return
    const res = await fetch(`/api/friends/${friendshipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    if (!res.ok) throw new Error('Failed to accept')
    setRel('friends')
  }

  async function remove() {
    if (!friendshipId) return
    const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed')
    setFriendshipId(null)
    setRel('none')
  }

  if (rel === 'friends') {
    return (
      <button
        onClick={() => run(remove)}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-1.5 text-xs font-medium hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
        Remove friend
      </button>
    )
  }

  if (rel === 'outgoing') {
    return (
      <button
        onClick={() => run(remove)}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border hover:text-foreground transition-colors"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        Cancel request
      </button>
    )
  }

  if (rel === 'incoming') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => run(accept)}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Accept request
        </button>
        <button
          onClick={() => run(remove)}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
          Decline
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => run(sendRequest)}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
      Add friend
      {error && <span className="ml-2 text-xs font-normal opacity-80">{error}</span>}
    </button>
  )
}
