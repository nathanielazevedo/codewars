import type { Server, Socket } from 'socket.io'
import { verifyArenaToken } from './jwt.js'
import { redisSub } from './redis.js'

type RoomPlayer = {
  userId: string
  username: string
  elo: number
  avatarUrl: string | null
  joinedAt: number
}

type RoomEvent =
  | { type: 'player_joined'; player: RoomPlayer }
  | { type: 'player_left'; userId: string }
  | { type: 'game_start'; matchId: string }

type MatchEvent =
  | { type: 'player_solved'; userId: string; username: string }
  | { type: 'game_end'; winnerId: string; winnerUsername: string }
  | { type: 'weapon_used'; weaponType: string; attackerId: string; attackerUsername: string; targetId: string; duration: number }
  | { type: 'weapon_blocked'; weaponType: string; attackerId: string; attackerUsername: string; targetId: string }
  | { type: 'ap_update'; userId: string; ap: number }

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
    console.log(`[socket] + ${socket.data.username} (${socket.id})`)

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
    })

    socket.on('match:leave', ({ matchId }: { matchId: string }) => {
      if (typeof matchId !== 'string') return
      socket.leave(`match:${matchId}`)
    })

    socket.on('queue:enter', () => {
      socket.join('queue:quickmatch')
    })

    socket.on('queue:exit', () => {
      socket.leave('queue:quickmatch')
    })

    socket.on('disconnect', () => {
      console.log(`[socket] - ${socket.data.username}`)
    })
  })

  redisSub.subscribe('queue:quickmatch:events', (err) => {
    if (err) console.error('[redis] subscribe queue error:', err)
    else console.log('[redis] subscribed to queue:quickmatch:events')
  })

  redisSub.on('message', (channel, message) => {
    if (channel !== 'queue:quickmatch:events') return
    let event: { type: 'update'; count: number; countdownEnds: number | null }
      | { type: 'matched'; matchId: string; userIds: string[] }
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
    }
  })

  redisSub.psubscribe('room:*:events', 'match:*:events', (err) => {
    if (err) console.error('[redis] psubscribe error:', err)
    else console.log('[redis] subscribed to room:*:events and match:*:events')
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
        case 'player_solved':
          io.to(socketRoom).emit('player:solved', {
            userId: event.userId,
            username: event.username,
          })
          break
        case 'game_end':
          io.to(socketRoom).emit('game:end', {
            winnerId: event.winnerId,
            winnerUsername: event.winnerUsername,
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
    }
  })
}
