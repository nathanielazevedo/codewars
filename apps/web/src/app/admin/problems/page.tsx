import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ProblemsListClient } from './problems-client'

export default async function AdminProblemsPage() {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  return <ProblemsListClient />
}
