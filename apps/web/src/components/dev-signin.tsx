import { TerminalSquare } from 'lucide-react'
import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function DevSignIn() {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="mt-6 pt-6 border-t border-border/80">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="amber" className="py-0.5">
          <TerminalSquare className="size-3" />
          Dev mode
        </Badge>
      </div>
      <form
        action={async (formData) => {
          'use server'
          await signIn('dev', formData)
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="redirectTo" value="/" />
        <Input
          name="username"
          placeholder="alice"
          autoComplete="off"
          required
          pattern="[a-z0-9_]{2,20}"
          className="font-mono"
        />
        <Button type="submit" variant="outline">
          Enter
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        Any lowercase username (2–20 chars). Creates a fake user on first use.
      </p>
    </div>
  )
}
