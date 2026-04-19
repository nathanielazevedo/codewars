'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CreateRoomButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        disabled={pending}
        size="lg"
        variant="outline"
        onClick={() =>
          start(async () => {
            setError(null)
            try {
              const res = await fetch('/api/rooms', { method: 'POST' })
              if (!res.ok) throw new Error(`HTTP ${res.status}`)
              const { room } = await res.json()
              router.push(`/room/${room.code}`)
            } catch (e) {
              setError((e as Error).message)
            }
          })
        }
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Creating…
          </>
        ) : (
          <>
            <Lock />
            Create Private Room
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">Failed: {error}</p>}
    </div>
  )
}
