'use client'

import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { isMuted, setMuted } from '@/lib/sounds'
import { cn } from '@/lib/cn'

export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMutedState] = useState(true)

  useEffect(() => {
    setMutedState(isMuted())
  }, [])

  function toggle() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={muted ? 'Sounds off — click to enable' : 'Sounds on — click to mute'}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      className={cn(
        'flex items-center justify-center size-8 rounded-md border transition-colors',
        muted
          ? 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
          : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
        className,
      )}
    >
      {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
    </button>
  )
}
