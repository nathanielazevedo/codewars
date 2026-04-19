'use client'

import { useRouter } from 'next/navigation'
import { Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QuickMatchButton() {
  const router = useRouter()
  return (
    <Button
      size="xl"
      variant="primary"
      onClick={() => router.push('/play/quickmatch')}
    >
      <Swords />
      Quick Match
    </Button>
  )
}
