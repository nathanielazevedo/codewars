'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords } from 'lucide-react'

interface Profile {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  bio: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  elo: number
  xp: number
  rankTier: string
  createdAt: string
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    username: '',
    bio: '',
    avatarUrl: '',
    githubUrl: '',
    linkedinUrl: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        setForm({
          username: data.username ?? '',
          bio: data.bio ?? '',
          avatarUrl: data.avatarUrl ?? '',
          githubUrl: data.githubUrl ?? '',
          linkedinUrl: data.linkedinUrl ?? '',
        })
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)

    if (res.ok) {
      setProfile(data)
      setMessage({ type: 'success', text: 'Profile updated!' })
    } else {
      setMessage({ type: 'error', text: data.error ?? 'Failed to save' })
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
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
          <Link href="/friends" className="text-muted-foreground hover:text-foreground transition-colors">Friends</Link>
          <Link href={`/u/${profile.username}`} className="text-muted-foreground hover:text-foreground transition-colors">My Profile</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl mb-6">Edit Profile</h1>

        {message && (
          <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Avatar URL</label>
            <input
              type="url"
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {form.avatarUrl && (
              <img src={form.avatarUrl} alt="Preview" className="mt-2 size-16 rounded-full object-cover border border-border" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              maxLength={280}
              placeholder="Tell people about yourself…"
              className="w-full rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/280</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">GitHub URL</label>
            <input
              type="url"
              value={form.githubUrl}
              onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
              placeholder="https://github.com/username"
              className="w-full rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">LinkedIn URL</label>
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/username"
              className="w-full rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </main>
    </div>
  )
}
