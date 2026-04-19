'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'

type TestCase = {
  input: string
  expectedOutput: string
}

type FormState = {
  title: string
  slug: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string
  starterCode: Record<string, string>
  testCases: TestCase[]
  timeLimitMs: number
  memoryLimitMb: number
}

const LANGUAGES = ['javascript', 'python'] as const

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  description: '',
  difficulty: 'easy',
  tags: '',
  starterCode: { javascript: '', python: '' },
  testCases: [{ input: '', expectedOutput: '' }],
  timeLimitMs: 2000,
  memoryLimitMb: 256,
}

export function ProblemFormClient({ problemId }: { problemId?: string }) {
  const router = useRouter()
  const isEdit = !!problemId
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'starter-code' | 'test-cases'>('details')
  const [codeLang, setCodeLang] = useState<string>('javascript')

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/admin/problems/${problemId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Problem not found')
        return r.json()
      })
      .then((data) => {
        setForm({
          title: data.title ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          difficulty: data.difficulty ?? 'easy',
          tags: (data.tags ?? []).join(', '),
          starterCode: data.starterCode ?? { javascript: '', python: '' },
          testCases: data.testCases?.length ? data.testCases : [{ input: '', expectedOutput: '' }],
          timeLimitMs: data.timeLimitMs ?? 2000,
          memoryLimitMb: data.memoryLimitMb ?? 256,
        })
      })
      .catch(() => setError('Failed to load problem'))
      .finally(() => setLoading(false))
  }, [isEdit, problemId])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60)
  }

  function addTestCase() {
    setForm((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '' }],
    }))
  }

  function removeTestCase(index: number) {
    setForm((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index),
    }))
  }

  function updateTestCase(index: number, field: keyof TestCase, value: string) {
    setForm((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)),
    }))
  }

  function updateStarterCode(lang: string, value: string) {
    setForm((prev) => ({
      ...prev,
      starterCode: { ...prev.starterCode, [lang]: value },
    }))
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description,
        difficulty: form.difficulty,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        starterCode: form.starterCode,
        testCases: form.testCases.filter((tc) => tc.input || tc.expectedOutput),
        timeLimitMs: form.timeLimitMs,
        memoryLimitMb: form.memoryLimitMb,
      }

      const url = isEdit ? `/api/admin/problems/${problemId}` : '/api/admin/problems'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save')
        return
      }

      router.push('/admin/problems')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="max-w-4xl mx-auto px-8 py-10 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    )

  return (
    <main className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push('/admin/problems')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to problems
          </button>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {isEdit ? 'Edit Problem' : 'New Problem'}
          </h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !form.title || !form.slug}
          variant="primary"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save />
              {isEdit ? 'Save Changes' : 'Create Problem'}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/40 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['details', 'starter-code', 'test-cases'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'details' ? 'Details' : tab === 'starter-code' ? 'Starter Code' : 'Test Cases'}
            {tab === 'test-cases' && (
              <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                ({form.testCases.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Details */}
      {activeTab === 'details' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  updateField('title', e.target.value)
                  if (!isEdit) updateField('slug', autoSlug(e.target.value))
                }}
                placeholder="Two Sum"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                placeholder="two-sum"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description (markdown)</Label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={12}
              placeholder="Given an array of integers..."
              className="flex w-full rounded-md border border-border bg-input/60 px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <select
                value={form.difficulty}
                onChange={(e) => updateField('difficulty', e.target.value as FormState['difficulty'])}
                className="flex h-10 w-full rounded-md border border-border bg-input/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Time Limit (ms)</Label>
              <Input
                type="number"
                value={form.timeLimitMs}
                onChange={(e) => updateField('timeLimitMs', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Memory Limit (MB)</Label>
              <Input
                type="number"
                value={form.memoryLimitMb}
                onChange={(e) => updateField('memoryLimitMb', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="array, hash-table"
            />
          </div>
        </div>
      )}

      {/* Starter Code */}
      {activeTab === 'starter-code' && (
        <div className="animate-fade-in">
          <div className="flex gap-1 mb-4">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => setCodeLang(lang)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                  codeLang === lang
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {lang}
              </button>
            ))}
          </div>
          <textarea
            value={form.starterCode[codeLang] ?? ''}
            onChange={(e) => updateStarterCode(codeLang, e.target.value)}
            rows={20}
            spellCheck={false}
            placeholder={`// ${codeLang} starter code...`}
            className="flex w-full rounded-md border border-border bg-card/40 px-4 py-3 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Include the stdin handler boilerplate so players can focus on the solution function.
          </p>
        </div>
      )}

      {/* Test Cases */}
      {activeTab === 'test-cases' && (
        <div className="space-y-4 animate-fade-in">
          {form.testCases.map((tc, i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-4 bg-card/40 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Test Case {i + 1}
                </span>
                {form.testCases.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTestCase(i)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 />
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="normal-case tracking-normal text-[11px]">
                    Input (stdin)
                  </Label>
                  <textarea
                    value={tc.input}
                    onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                    rows={3}
                    spellCheck={false}
                    placeholder="[2,7,11,15]&#10;9"
                    className="flex w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="normal-case tracking-normal text-[11px]">
                    Expected Output (stdout)
                  </Label>
                  <textarea
                    value={tc.expectedOutput}
                    onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)}
                    rows={3}
                    spellCheck={false}
                    placeholder="[0,1]"
                    className="flex w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addTestCase}
            className="w-full py-3 rounded-md border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="size-4" />
            Add Test Case
          </button>
        </div>
      )}
    </main>
  )
}
