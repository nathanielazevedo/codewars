'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Pencil, Search, ShieldCheck, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

interface User {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  provider: string
  elo: number
  rankTier: string
  isAdmin: boolean
  createdAt: string
}

const TIER_VARIANT: Record<string, BadgeProps['variant']> = {
  bronze: 'amber',
  silver: 'default',
  gold: 'amber',
  platinum: 'primary',
  diamond: 'secondary',
}

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ isAdmin: boolean; elo: number; rankTier: string }>({
    isAdmin: false,
    elo: 1200,
    rankTier: 'bronze',
  })

  async function fetchUsers(q = '') {
    setLoading(true)
    const res = await fetch(`/api/admin/users${q ? `?search=${encodeURIComponent(q)}` : ''}`)
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchUsers(search)
  }

  function startEdit(user: User) {
    setEditingId(user.id)
    setEditForm({ isAdmin: user.isAdmin, elo: user.elo, rankTier: user.rankTier })
  }

  async function saveEdit(userId: string) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
      setEditingId(null)
    } else {
      const data = await res.json()
      alert(data.error ?? 'Failed to update user')
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">{users.length} registered</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl bg-card/40 backdrop-blur-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Elo</th>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize text-xs">
                    {user.provider}
                  </td>

                  {editingId === user.id ? (
                    <>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={editForm.elo}
                          onChange={(e) => setEditForm({ ...editForm, elo: Number(e.target.value) })}
                          className="w-24 h-8 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.rankTier}
                          onChange={(e) => setEditForm({ ...editForm, rankTier: e.target.value })}
                          className="h-8 rounded-md border border-border bg-input/60 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="bronze">Bronze</option>
                          <option value="silver">Silver</option>
                          <option value="gold">Gold</option>
                          <option value="platinum">Platinum</option>
                          <option value="diamond">Diamond</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isAdmin}
                            onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                            className="size-4 rounded border-border accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editForm.isAdmin ? 'Yes' : 'No'}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => saveEdit(user.id)}
                            className="h-7"
                          >
                            <Check className="size-3" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-7"
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono tabular-nums">{user.elo}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={TIER_VARIANT[user.rankTier] ?? 'default'}
                          className="capitalize"
                        >
                          {user.rankTier}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.isAdmin ? (
                          <Badge variant="primary">
                            <ShieldCheck className="size-3" />
                            Admin
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(user)}
                            className="h-7"
                          >
                            <Pencil className="size-3" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
