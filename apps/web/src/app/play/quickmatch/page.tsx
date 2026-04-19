import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { QuickMatchClient } from './quickmatch-client'
import { quickmatchStatus } from '@/lib/queue'

export default async function QuickMatchPage() {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const initialStatus = await quickmatchStatus(session.user.id)
  return (
    <QuickMatchClient
      currentUserId={session.user.id}
      initialStatus={initialStatus}
    />
  )
}
