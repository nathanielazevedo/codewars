import type { Server, Socket } from 'socket.io'
import { verifyArenaToken } from './jwt.js'
import { redis, redisSub } from './redis.js'

const PRESENCE_ONLINE = 'presence:online'
const PRESENCE_IN_MATCH = 'presence:in_match'
const PRESENCE_EVENTS = 'presence:events'

function userSocketsKey(userId: string) {
  return `presence:user:${userId}:sockets`
}

async function markOnline(userId: string, socketId: string) {
  const count = await redis.scard(userSocketsKey(userId))
  await redis.sadd(userSocketsKey(userId), socketId)
  await redis.expire(userSocketsKey(userId), 60 * 60 * 12)
  if (count === 0) {
    await redis.sadd(PRESENCE_ONLINE, userId)
    await redis.publish(PRESENCE_EVENTS, JSON.stringify({ type: 'online', userId }))
  }
}

async function markOffline(userId: string, socketId: string) {
  await redis.srem(userSocketsKey(userId), socketId)
  const remaining = await redis.scard(userSocketsKey(userId))
  if (remaining === 0) {
    await redis.srem(PRESENCE_ONLINE, userId)
    await redis.hdel(PRESENCE_IN_MATCH, userId)
    await redis.publish(PRESENCE_EVENTS, JSON.stringify({ type: 'offline', userId }))
  }
}

async function markInMatch(userId: string, matchId: string | null) {
  if (matchId) {
    await redis.hset(PRESENCE_IN_MATCH, userId, matchId)
  } else {
    await redis.hdel(PRESENCE_IN_MATCH, userId)
  }
  await redis.publish(
    PRESENCE_EVENTS,
    JSON.stringify({ type: 'in_match', userId, matchId }),
  )
}

type RoomPlayer = {
  userId: string
  username: string
  elo: number
  avatarUrl: string | null
  joinedAt: number
}

type ChatMessage = {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  text: string
  sentAt: number
}

type RoomEvent =
  | { type: 'player_joined'; player: RoomPlayer }
  | { type: 'player_left'; userId: string }
  | { type: 'game_start'; matchId: string }
  | { type: 'chat_message'; message: ChatMessage }

type Placement = {
  userId: string
  placement: number
  testsPassed: number
  finishedAt: number | null
}

type MatchEvent =
  | { type: 'player_progress'; userId: string; username: string; testsPassed: number; totalTests: number; finishedAt: number | null }
  | { type: 'player_finished'; userId: string; username: string; finishedAt: number }
  | { type: 'game_end'; placements: Placement[]; eloDeltas: Record<string, number> }
  | { type: 'weapon_used'; weaponType: string; attackerId: string; attackerUsername: string; targetId: string; duration: number }
  | { type: 'weapon_blocked'; weaponType: string; attackerId: string; attackerUsername: string; targetId: string }
  | { type: 'ap_update'; userId: string; ap: number }
  | { type: 'tick'; timeRemainingMs: number }

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token || typeof token !== 'string') return next(new Error('UNAUTHORIZED'))
    try {
      const payload = verifyArenaToken(token)
      socket.data.userId = payload.userId
      socket.data.username = payload.username
      next()
    } catch {
      next(new Error('INVALID_TOKEN'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string
    console.log(`[socket] + ${socket.data.username} (${socket.id})`)

    socket.join(`user:${userId}`)
    void markOnline(userId, socket.id).catch((err) =>
      console.error('[presence] online error:', err),
    )

    socket.on('room:join', ({ code }: { code: string }) => {
      if (typeof code !== 'string') return
      socket.join(`room:${code.toUpperCase()}`)
    })

    socket.on('room:leave', ({ code }: { code: string }) => {
      if (typeof code !== 'string') return
      socket.leave(`room:${code.toUpperCase()}`)
    })

    socket.on('match:join', ({ matchId }: { matchId: string }) => {
      if (typeof matchId !== 'string') return
      socket.join(`match:${matchId}`)
      void markInMatch(userId, matchId).catch((err) =>
        console.error('[presence] in_match error:', err),
      )
    })

    socket.on('match:leave', ({ matchId }: { matchId: string }) => {
      if (typeof matchId !== 'string') return
      socket.leave(`match:${matchId}`)
      void markInMatch(userId, null).catch((err) =>
        console.error('[presence] in_match error:', err),
      )
    })

    socket.on('queue:enter', () => {
      socket.join('queue:quickmatch')
    })

    socket.on('queue:exit', () => {
      socket.leave('queue:quickmatch')
    })

    socket.on('disconnect', () => {
      console.log(`[socket] - ${socket.data.username}`)
      void markOffline(userId, socket.id).catch((err) =>
        console.error('[presence] offline error:', err),
      )
    })
  })

  redisSub.subscribe('queue:quickmatch:events', 'presence:events', (err) => {
    if (err) console.error('[redis] subscribe error:', err)
    else console.log('[redis] subscribed to queue + presence channels')
  })

  redisSub.on('message', (channel, message) => {
    if (channel === 'queue:quickmatch:events') {
      let event:
        | { type: 'update'; count: number; countdownEnds: number | null }
        | { type: 'matched'; matchId: string; userIds: string[] }
        | { type: 'chat_message'; message: ChatMessage }
      try {
        event = JSON.parse(message)
      } catch {
        return
      }
      if (event.type === 'update') {
        io.to('queue:quickmatch').emit('queue:update', {
          count: event.count,
          countdownEnds: event.countdownEnds,
        })
      } else if (event.type === 'matched') {
        io.to('queue:quickmatch').emit('queue:matched', {
          matchId: event.matchId,
          userIds: event.userIds,
        })
      } else if (event.type === 'chat_message') {
        io.to('queue:quickmatch').emit('queue:chat', { message: event.message })
      }
      return
    }

    if (channel === 'presence:events') {
      let event:
        | { type: 'online'; userId: string }
        | { type: 'offline'; userId: string }
        | { type: 'in_match'; userId: string; matchId: string | null }
      try {
        event = JSON.parse(message)
      } catch {
        return
      }
      if (event.type === 'online') {
        io.emit('presence:online', { userId: event.userId })
      } else if (event.type === 'offline') {
        io.emit('presence:offline', { userId: event.userId })
      } else if (event.type === 'in_match') {
        io.emit('presence:in_match', { userId: event.userId, matchId: event.matchId })
      }
      return
    }
  })

  redisSub.psubscribe('room:*:events', 'match:*:events', 'user:*:events', (err) => {
    if (err) console.error('[redis] psubscribe error:', err)
    else console.log('[redis] subscribed to room/match/user event patterns')
  })

  redisSub.on('pmessage', (_pattern, channel, message) => {
    const roomMatch = channel.match(/^room:([^:]+):events$/)
    if (roomMatch) {
      let event: RoomEvent
      try {
        event = JSON.parse(message)
      } catch {
        return
      }
      const socketRoom = `room:${roomMatch[1]}`
      switch (event.type) {
        case 'player_joined':
          io.to(socketRoom).emit('lobby:player_joined', { player: event.player })
          break
        case 'player_left':
          io.to(socketRoom).emit('lobby:player_left', { userId: event.userId })
          break
        case 'game_start':
          io.to(socketRoom).emit('game:start', { matchId: event.matchId })
          break
        case 'chat_message':
          io.to(socketRoom).emit('lobby:chat', { message: event.message })
          break
      }
      return
    }

    const matchChan = channel.match(/^match:([^:]+):events$/)
    if (matchChan) {
      let event: MatchEvent
      try {
        event = JSON.parse(message)
      } catch {
        return
      }
      const socketRoom = `match:${matchChan[1]}`
      switch (event.type) {
        case 'player_progress':
          io.to(socketRoom).emit('player:progress', {
            userId: event.userId,
            username: event.username,
            testsPassed: event.testsPassed,
            totalTests: event.totalTests,
            finishedAt: event.finishedAt,
          })
          break
        case 'player_finished':
          io.to(socketRoom).emit('player:finished', {
            userId: event.userId,
            username: event.username,
            finishedAt: event.finishedAt,
          })
          break
        case 'game_end':
          io.to(socketRoom).emit('game:end', {
            placements: event.placements,
            eloDeltas: event.eloDeltas,
          })
          break
        case 'tick':
          io.to(socketRoom).emit('game:tick', {
            timeRemainingMs: event.timeRemainingMs,
          })
          break
        case 'weapon_used':
          io.to(socketRoom).emit('weapon:incoming', {
            weaponType: event.weaponType,
            attackerId: event.attackerId,
            attackerUsername: event.attackerUsername,
            targetId: event.targetId,
            duration: event.duration,
          })
          break
        case 'weapon_blocked':
          io.to(socketRoom).emit('weapon:blocked', {
            weaponType: event.weaponType,
            attackerId: event.attackerId,
            targetId: event.targetId,
          })
          break
        case 'ap_update':
          io.to(socketRoom).emit('player:ap_update', {
            userId: event.userId,
            ap: event.ap,
          })
          break
      }
      return
    }

    const userChan = channel.match(/^user:([^:]+):events$/)
    if (userChan) {
      let event:
        | { type: 'challenge'; fromId: string; fromUsername: string; roomCode: string; sentAt: number }
        | { type: 'invite'; fromId: string; fromUsername: string; roomCode: string; sentAt: number }
      try {
        event = JSON.parse(message)
      } catch {
        return
      }
      const socketRoom = `user:${userChan[1]}`
      if (event.type === 'challenge') {
        io.to(socketRoom).emit('friend:challenge', {
          fromId: event.fromId,
          fromUsername: event.fromUsername,
          roomCode: event.roomCode,
          sentAt: event.sentAt,
        })
      } else if (event.type === 'invite') {
        io.to(socketRoom).emit('room:invite', {
          fromId: event.fromId,
          fromUsername: event.fromUsername,
          roomCode: event.roomCode,
          sentAt: event.sentAt,
        })
      }
    }
  })
}
