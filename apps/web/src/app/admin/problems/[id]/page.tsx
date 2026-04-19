import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ProblemFormClient } from '../problem-form-client'

export default async function EditProblemPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  return <ProblemFormClient problemId={params.id} />
}
