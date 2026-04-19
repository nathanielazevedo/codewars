import { WEAPONS, type WeaponType } from '@code-arena/types'
import { readMatch, writeMatch, publishEvent, type Match } from './matches'

export type UseWeaponResult =
  | { ok: true; blocked: false }
  | { ok: true; blocked: true }
  | { ok: false; error: string; status: number }

export async function useWeapon(
  matchId: string,
  attackerId: string,
  attackerUsername: string,
  targetId: string,
  weaponType: WeaponType,
): Promise<UseWeaponResult> {
  const weapon = WEAPONS[weaponType]
  if (!weapon) return { ok: false, error: 'INVALID_WEAPON', status: 400 }

  const match = await readMatch(matchId)
  if (!match) return { ok: false, error: 'MATCH_NOT_FOUND', status: 404 }
  if (match.status !== 'active') return { ok: false, error: 'MATCH_NOT_ACTIVE', status: 409 }

  const attackerState = match.playerStates[attackerId]
  if (!attackerState) return { ok: false, error: 'NOT_IN_MATCH', status: 403 }

  // Self-targeting only allowed for shield and time_warp
  if (weaponType === 'shield' || weaponType === 'time_warp') {
    if (targetId !== attackerId) return { ok: false, error: 'SELF_TARGET_ONLY', status: 400 }
  } else if (weaponType !== 'nuke') {
    if (targetId === attackerId) return { ok: false, error: 'CANNOT_TARGET_SELF', status: 400 }
    if (!match.playerStates[targetId]) return { ok: false, error: 'TARGET_NOT_IN_MATCH', status: 400 }
  }

  // AP check
  if (attackerState.ap < weapon.cost) return { ok: false, error: 'INSUFFICIENT_AP', status: 422 }

  // Cooldown check
  const cooldownUntil = attackerState.cooldowns[weaponType] ?? 0
  if (cooldownUntil > Date.now()) return { ok: false, error: 'ON_COOLDOWN', status: 422 }

  // Nuke: once per match
  if (weaponType === 'nuke' && attackerState.nukeUsed) {
    return { ok: false, error: 'NUKE_ALREADY_USED', status: 422 }
  }

  // Frozen attacker can't use weapons
  if (attackerState.frozenUntil > Date.now()) {
    return { ok: false, error: 'YOU_ARE_FROZEN', status: 422 }
  }

  // Deduct AP and set cooldown
  attackerState.ap -= weapon.cost
  if (weapon.cooldownMs > 0) {
    attackerState.cooldowns[weaponType] = Date.now() + weapon.cooldownMs
  }
  if (weaponType === 'nuke') attackerState.nukeUsed = true

  // Handle self-targeting weapons
  if (weaponType === 'shield') {
    attackerState.shield = true
    await writeMatch(match)
    await publishEvent(matchId, { type: 'ap_update', userId: attackerId, ap: attackerState.ap })
    return { ok: true, blocked: false }
  }

  if (weaponType === 'time_warp') {
    // Time warp is a self-buff — no effect on others for now
    await writeMatch(match)
    await publishEvent(matchId, { type: 'ap_update', userId: attackerId, ap: attackerState.ap })
    return { ok: true, blocked: false }
  }

  // Nuke: apply freeze to ALL opponents
  if (weaponType === 'nuke') {
    const frozenUntil = Date.now() + weapon.durationMs
    for (const [uid, state] of Object.entries(match.playerStates)) {
      if (uid === attackerId) continue
      if (state.shield) {
        state.shield = false
        await publishEvent(matchId, {
          type: 'weapon_blocked',
          weaponType,
          attackerId,
          attackerUsername,
          targetId: uid,
        })
      } else {
        state.frozen = true
        state.frozenUntil = frozenUntil
        await publishEvent(matchId, {
          type: 'weapon_used',
          weaponType: 'freeze',
          attackerId,
          attackerUsername,
          targetId: uid,
          duration: weapon.durationMs,
        })
      }
    }
    await writeMatch(match)
    await publishEvent(matchId, { type: 'ap_update', userId: attackerId, ap: attackerState.ap })
    return { ok: true, blocked: false }
  }

  // Single-target weapons: check shield
  const targetState = match.playerStates[targetId]
  if (targetState.shield) {
    targetState.shield = false
    await writeMatch(match)
    await publishEvent(matchId, { type: 'ap_update', userId: attackerId, ap: attackerState.ap })
    await publishEvent(matchId, {
      type: 'weapon_blocked',
      weaponType,
      attackerId,
      attackerUsername,
      targetId,
    })
    return { ok: true, blocked: true }
  }

  // Apply effect to target
  applyEffect(match, targetId, weaponType, weapon.durationMs)

  await writeMatch(match)
  await publishEvent(matchId, { type: 'ap_update', userId: attackerId, ap: attackerState.ap })
  await publishEvent(matchId, {
    type: 'weapon_used',
    weaponType,
    attackerId,
    attackerUsername,
    targetId,
    duration: weapon.durationMs,
  })

  return { ok: true, blocked: false }
}

function applyEffect(match: Match, targetId: string, weaponType: WeaponType, durationMs: number) {
  const state = match.playerStates[targetId]
  if (!state) return

  switch (weaponType) {
    case 'freeze':
      state.frozen = true
      state.frozenUntil = Date.now() + durationMs
      break
    case 'screen_lock':
      // Visual only — handled client-side, server just records the event
      break
    case 'shuffle':
      // Client-side effect — scrambles code in editor
      break
    case 'mirage':
      state.mirage = true
      break
    case 'code_bomb':
      // Client-side effect — inserts random chars
      break
  }
}
