import { auth } from '@/auth'
import { useWeapon } from '@/lib/weapons'
import type { WeaponType } from '@code-arena/types'
import { NextResponse } from 'next/server'

const VALID_WEAPONS = new Set([
  'freeze', 'screen_lock', 'shuffle', 'mirage',
  'code_bomb', 'shield', 'time_warp', 'nuke',
])

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = (await req.json()) as {
    matchId?: string
    weaponType?: string
    targetId?: string
  }

  if (!body.matchId || !body.weaponType || !body.targetId) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  if (!VALID_WEAPONS.has(body.weaponType)) {
    return NextResponse.json({ error: 'INVALID_WEAPON' }, { status: 400 })
  }

  const result = await useWeapon(
    body.matchId,
    session.user.id,
    session.user.username,
    body.targetId,
    body.weaponType as WeaponType,
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ blocked: result.blocked })
}
