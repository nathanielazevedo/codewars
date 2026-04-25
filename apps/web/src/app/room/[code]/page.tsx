import { auth } from '@/auth'
import { getRoom } from '@/lib/rooms'
import { notFound, redirect } from 'next/navigation'
import { LobbyClient } from './lobby-client'

export default async function RoomPage({ params }: { params: { code: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const code = params.code.toUpperCase()
  const room = await getRoom(code)
  if (!room) notFound()

  return (
    <LobbyClient
      initialRoom={room}
      currentUserId={session.user.id}
      isAdmin={Boolean(session.user.isAdmin)}
    />
  )
}
