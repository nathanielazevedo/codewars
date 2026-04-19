import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import FriendsClient from './friends-client'

export default async function FriendsPage() {
  const session = await auth()
  if (!session?.user) redirect('/signin')
  return <FriendsClient />
}
