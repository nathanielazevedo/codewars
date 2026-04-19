'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, type BadgeProps } from '@/components/ui/badge'

type Problem = {
  id: string
  slug: string
  title: string
  difficulty: string
  tags: string[]
  testCases: unknown[]
  createdAt: string
}

const DIFF_VARIANT: Record<string, BadgeProps['variant']> = {
  easy: 'emerald',
  medium: 'amber',
  hard: 'rose',
}

export function ProblemsListClient() {
  const router = useRouter()
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/problems')
      .then((r) => r.json())
      .then((data) => setProblems(data))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/problems/${id}`, { method: 'DELETE' })
    if (res.ok) setProblems((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <main className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Problem Pool</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {problems.length} problem{problems.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/problems/new"
          className={buttonVariants({ variant: 'primary', size: 'sm' })}
        >
          <Plus />
          New Problem
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-dashed border-border">
          <div className="text-muted-foreground mb-3">No problems yet</div>
          <Link
            href="/admin/problems/new"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Plus />
            Create your first problem
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Difficulty</th>
                <th className="text-left px-4 py-3 font-medium">Tests</th>
                <th className="text-left px-4 py-3 font-medium">Tags</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {problems.map((p) => (
                <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={DIFF_VARIANT[p.difficulty] ?? 'default'} className="capitalize">
                      {p.difficulty}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                    {p.testCases?.length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(p.tags ?? []).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/problems/${p.id}`)}
                      >
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(p.id, p.title)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
