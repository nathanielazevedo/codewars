'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, UserPlus, Check, X, UserMinus } from 'lucide-react'

interface FriendUser {
  id: string
  username: string
  avatarUrl: string | null
  elo: number
  rankTier: string
  friendshipId: string
}

export default function FriendsClient() {
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [incoming, setIncoming] = useState<FriendUser[]>([])
  const [outgoing, setOutgoing] = useState<FriendUser[]>([])
  const [loading, setLoading] = useState(true)
  const [addUsername, setAddUsername] = useState('')
  const [addMessage, setAddMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function fetchFriends() {
    setLoading(true)
    const res = await fetch('/api/friends')
    if (res.ok) {
      const data = await res.json()
      setFriends(data.friends)
      setIncoming(data.incoming)
      setOutgoing(data.outgoing)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFriends()
  }, [])

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault()
    setAddMessage(null)
    if (!addUsername.trim()) return

    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: addUsername.trim() }),
    })
    const data = await res.json()

    if (res.ok) {
      setAddMessage({ type: 'success', text: 'Friend request sent!' })
      setAddUsername('')
      fetchFriends()
    } else {
      setAddMessage({ type: 'error', text: data.error ?? 'Failed to send' })
    }
  }

  async function handleAction(friendshipId: string, action: 'accept' | 'reject') {
    await fetch(`/api/friends/${friendshipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    fetchFriends()
  }

  async function removeFriend(friendshipId: string) {
    await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
    fetchFriends()
  }

  return (
    <div className="min-h-screen arena-bg">
      <header className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/60 backdrop-blur-sm bg-background/40">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <Swords className="size-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Code<span className="text-primary">Arena</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl mb-6">Friends</h1>

        {/* Add friend */}
        <form onSubmit={sendRequest} className="mb-8 flex gap-2">
          <input
            type="text"
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            placeholder="Enter username…"
            className="flex-1 rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <UserPlus className="size-4" />
            Add
          </button>
        </form>

        {addMessage && (
          <div className={`mb-6 rounded-lg px-4 py-2.5 text-sm ${addMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {addMessage.text}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-8">
            {/* Incoming requests */}
            {incoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Incoming Requests ({incoming.length})
                </h2>
                <div className="space-y-2">
                  {incoming.map((user) => (
                    <div key={user.friendshipId} className="flex items-center justify-between rounded-lg border border-border/80 bg-card/40 px-4 py-3">
                      <Link href={`/u/${user.username}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <Avatar user={user} />
                        <div>
                          <div className="font-medium text-sm">{user.username}</div>
                          <div className="text-xs text-muted-foreground">{user.elo} Elo · <span className="capitalize">{user.rankTier}</span></div>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(user.friendshipId, 'accept')} className="rounded-lg bg-green-600 p-2 hover:bg-green-700 transition-colors" title="Accept">
                          <Check className="size-4" />
                        </button>
                        <button onClick={() => handleAction(user.friendshipId, 'reject')} className="rounded-lg bg-red-600/80 p-2 hover:bg-red-700 transition-colors" title="Reject">
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Outgoing requests */}
            {outgoing.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Pending Requests ({outgoing.length})
                </h2>
                <div className="space-y-2">
                  {outgoing.map((user) => (
                    <div key={user.friendshipId} className="flex items-center justify-between rounded-lg border border-border/80 bg-card/40 px-4 py-3">
                      <Link href={`/u/${user.username}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <Avatar user={user} />
                        <div>
                          <div className="font-medium text-sm">{user.username}</div>
                          <div className="text-xs text-muted-foreground">{user.elo} Elo · <span className="capitalize">{user.rankTier}</span></div>
                        </div>
                      </Link>
                      <button onClick={() => removeFriend(user.friendshipId)} className="rounded-lg bg-gray-700 p-2 hover:bg-gray-600 transition-colors text-xs" title="Cancel">
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Friends list */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Friends ({friends.length})
              </h2>
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">No friends yet. Send a request above!</p>
              ) : (
                <div className="space-y-2">
                  {friends.map((user) => (
                    <div key={user.friendshipId} className="flex items-center justify-between rounded-lg border border-border/80 bg-card/40 px-4 py-3">
                      <Link href={`/u/${user.username}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <Avatar user={user} />
                        <div>
                          <div className="font-medium text-sm">{user.username}</div>
                          <div className="text-xs text-muted-foreground">{user.elo} Elo · <span className="capitalize">{user.rankTier}</span></div>
                        </div>
                      </Link>
                      <button onClick={() => removeFriend(user.friendshipId)} className="rounded-lg p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Remove friend">
                        <UserMinus className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function Avatar({ user }: { user: { username: string; avatarUrl: string | null } }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
  }
  return (
    <div className="size-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 grid place-items-center text-xs font-bold">
      {user.username[0].toUpperCase()}
    </div>
  )
}
