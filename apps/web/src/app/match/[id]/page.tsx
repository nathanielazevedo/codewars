import { auth } from '@/auth'
import { getMatch } from '@/lib/matches'
import { getProblem } from '@/lib/problems'
import { notFound, redirect } from 'next/navigation'
import { MatchClient } from './match-client'

export default async function MatchPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const match = await getMatch(params.id)
  if (!match) notFound()

  const problem = await getProblem(match.problemId)
  if (!problem) notFound()

  return <MatchClient initialMatch={match} problem={problem} currentUserId={session.user.id} />
}
