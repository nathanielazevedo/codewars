# Code Arena — System Design Document

> Real-time multiplayer DSA battle game with weapon mechanics

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [AWS Infrastructure](#aws-infrastructure)
5. [Database Design](#database-design)
6. [Real-Time System](#real-time-system)
7. [Code Execution Engine](#code-execution-engine)
8. [Weapon System](#weapon-system)
9. [Matchmaking](#matchmaking)
10. [Auth & OAuth](#auth--oauth)
11. [API Design](#api-design)
12. [CI/CD Pipeline](#cicd-pipeline)
13. [Scalability Considerations](#scalability-considerations)
14. [Cost Estimate](#cost-estimate)

---

## Overview

Code Arena is a real-time multiplayer DSA coding battle platform. Players solve algorithmic problems while using weapons earned through performance to disrupt opponents. Matches support 2–8 players, last 15–30 minutes, and run on a public matchmaking queue or private invite rooms.

**Core pillars:**
- Sub-100ms weapon effect delivery via WebSockets
- Isolated, sandboxed code execution per submission
- Fair matchmaking based on skill rating (ELO-style)
- Persistent progression (rank, XP, weapon unlocks)
- OAuth login via GitHub and Google

---

## Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR for lobby/leaderboard pages, CSR for the live arena |
| Code editor | **Monaco Editor** | Same engine as VS Code; supports syntax highlighting, real-time DOM manipulation for weapon effects |
| Real-time client | **Socket.io client** | Pairs with Socket.io server; auto-reconnect, fallback to long-polling |
| State management | **Zustand** | Lightweight, no boilerplate; ideal for syncing game state from socket events |
| Styling | **Tailwind CSS** | Utility-first, fast iteration |
| Language | **TypeScript** | End-to-end type safety across client and server |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| Runtime | **Node.js 20 (LTS)** | Non-blocking I/O ideal for real-time; shares TypeScript with frontend |
| Web framework | **Express.js** | Minimal, flexible; easy to mount Socket.io alongside REST routes |
| Real-time | **Socket.io** | Rooms, namespaces, and broadcasting built-in |
| Job queue | **BullMQ** | Redis-backed queue for code execution jobs; retries and priorities |
| Auth | **Auth.js v5 (NextAuth)** | OAuth (GitHub + Google) + JWT sessions; native Next.js integration |

### Data Layer
| Layer | Choice | Reason |
|---|---|---|
| Primary DB | **Amazon RDS (PostgreSQL 16)** | Managed Postgres with automated backups, Multi-AZ failover |
| ORM | **Prisma** | Type-safe queries, migrations, schema-as-code |
| Cache / Pub-Sub | **Amazon ElastiCache (Redis 7)** | Match state, session store, Socket.io adapter, BullMQ backend |
| Object storage | **Amazon S3** | User avatars, problem assets, match replay archives |
| CDN | **Amazon CloudFront** | Serve Next.js static assets and S3 content globally |

### Code Execution
| Layer | Choice | Reason |
|---|---|---|
| Execution API | **Judge0 CE** | Open-source, self-hostable, 60+ languages, sandboxed with cgroups |
| Deployment | **Dedicated EC2 instance (isolated VPC subnet)** | Separate from main app; malicious submissions cannot affect core infra |

### Infrastructure
| Layer | Choice | Reason |
|---|---|---|
| Frontend hosting | **AWS Amplify** | Zero-config Next.js hosting on AWS, auto preview deployments on PRs |
| API server | **ECS Fargate** | Serverless containers; auto-scales without managing EC2 fleets |
| Load balancer | **ALB (Application Load Balancer)** | Routes HTTP + WebSocket traffic; sticky sessions for Socket.io |
| Secrets | **AWS Secrets Manager** | OAuth secrets, DB passwords, API keys — injected into ECS at runtime |
| Monitoring | **CloudWatch + Sentry** | Infra metrics + application error tracking |
| CI/CD | **GitHub Actions** | Build, test, push Docker images to ECR, deploy to ECS via OIDC (no stored AWS keys) |

---

## Architecture

```
                         ┌─────────────────────────┐
                         │   Route 53 (DNS)         │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │   CloudFront (CDN)       │
                         └────────┬────────┬────────┘
                                  │        │
               ┌──────────────────▼┐      ┌▼──────────────────┐
               │  AWS Amplify       │      │  ALB               │
               │  (Next.js frontend)│      │  (API + WebSocket) │
               └────────────────────┘      └────────┬──────────┘
                                                    │
                                      ┌─────────────▼──────────────┐
                                      │   ECS Fargate (API Service) │
                                      │  ┌─────────┐ ┌──────────┐  │
                                      │  │ Express │ │Socket.io │  │
                                      │  │REST API │ │Game Srv  │  │
                                      │  └────┬────┘ └────┬─────┘  │
                                      │       └─────┬──────┘        │
                                      │  ┌──────────▼────────────┐  │
                                      │  │   Business Logic       │  │
                                      │  │  MatchManager          │  │
                                      │  │  WeaponEngine          │  │
                                      │  │  ScoreEngine           │  │
                                      │  └────┬───────────┬───────┘  │
                                      └───────┼───────────┼──────────┘
                                              │           │
                              ┌───────────────▼┐  ┌───────▼───────────┐
                              │  RDS PostgreSQL │  │ ElastiCache Redis  │
                              │  (Multi-AZ)    │  │ (match state,      │
                              └────────────────┘  │  queue, pub/sub)   │
                                                  └──────┬─────────────┘
                                                         │ BullMQ job
                                                  ┌──────▼─────────────┐
                                                  │  EC2 (Judge0 CE)   │
                                                  │  isolated subnet   │
                                                  └────────────────────┘
```

### Key design decisions

- **Monorepo** with `apps/web` (Next.js) and `apps/api` (Express) under a single `pnpm` workspace — shared TypeScript types in `packages/types`
- **Game state is authoritative in Redis**, never in ECS container memory — allows horizontal scaling without sticky sessions
- **Weapon effects validated server-side** — clients cannot fake AP balances or replay weapon events
- **Judge0 runs in an isolated VPC subnet** with no inbound internet access — only the API server's security group can reach it on port 2358
- **ALB sticky sessions** (duration-based cookie, 30-min TTL) keep Socket.io clients on the same ECS task during a match

---

## AWS Infrastructure

### VPC Layout

```
VPC: 10.0.0.0/16
│
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24)  — Multi-AZ
│   ├── ALB
│   └── NAT Gateway
│
├── Private Subnets (10.0.11.0/24, 10.0.12.0/24) — Multi-AZ
│   ├── ECS Fargate tasks (API server)
│   ├── RDS PostgreSQL primary + standby
│   └── ElastiCache Redis primary + replica
│
└── Isolated Subnet (10.0.21.0/24)
    └── EC2 (Judge0) — no internet route, only reachable from private subnet
```

### Security Groups

| Resource | Inbound | Outbound |
|---|---|---|
| ALB | 80, 443 from 0.0.0.0/0 | 3001 to ECS SG |
| ECS tasks | 3001 from ALB SG only | 5432 to RDS SG, 6379 to Redis SG, 2358 to Judge0 SG, 443 to internet (OAuth) |
| RDS | 5432 from ECS SG only | None |
| ElastiCache | 6379 from ECS SG only | None |
| Judge0 EC2 | 2358 from ECS SG only | None |

### ECS Fargate Service

```
Task Definition:
  CPU:    512 (0.5 vCPU)
  Memory: 1024 MB
  Image:  {account}.dkr.ecr.us-east-1.amazonaws.com/code-arena-api:{sha}
  Port:   3001

Auto Scaling:
  Min tasks: 2   (high availability across 2 AZs)
  Max tasks: 10
  Scale-out:  CPU > 70% for 2 consecutive minutes
  Scale-in:   CPU < 30% for 10 minutes
```

### RDS PostgreSQL

```
Instance:     db.t3.medium (dev) / db.r6g.large (prod)
Engine:       PostgreSQL 16
Multi-AZ:     enabled (auto failover ~60s)
Storage:      100 GB gp3, auto-scale to 1 TB
Backups:      7-day automated retention
Maintenance:  Sunday 03:00–04:00 UTC
```

### ElastiCache Redis

```
Mode:         Cluster mode disabled (single primary + 1 replica)
Instance:     cache.t3.medium
Persistence:  AOF enabled (appendfsync everysec)
Failover:     automatic (replica promoted in ~30s)
```

### EC2 — Judge0

```
Instance:   c5.xlarge (4 vCPU, 8 GB RAM)
AMI:        Ubuntu 22.04 LTS
Storage:    50 GB gp3
Placement:  Isolated subnet — no Elastic IP, no internet gateway route
Access:     SSM Session Manager only (no SSH port open)
```

### S3 Buckets

```
code-arena-assets-prod        public (via CloudFront) — avatars, problem images
code-arena-match-archives     private — finished match JSON; lifecycle: Glacier after 90d
code-arena-backups            private — manual RDS snapshot exports
```

### CloudFront Distribution

```
Origin 1: AWS Amplify app         → /*
Origin 2: S3 assets bucket        → /assets/*
Cache policy:
  - Static assets: CachingOptimized (1 year TTL)
  - API routes:    CachingDisabled
SSL: ACM certificate (auto-renew, us-east-1 for CloudFront)
```

---

## Database Design

### Users

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(32) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  avatar_url  TEXT,
  provider    VARCHAR(16) NOT NULL,        -- 'github' | 'google'
  provider_id VARCHAR(255) NOT NULL,       -- OAuth subject id
  elo         INT NOT NULL DEFAULT 1200,
  xp          INT NOT NULL DEFAULT 0,
  rank_tier   VARCHAR(16) NOT NULL DEFAULT 'bronze',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);
```

### Problems

```sql
CREATE TABLE problems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  description     TEXT NOT NULL,              -- markdown
  difficulty      VARCHAR(8) NOT NULL,        -- 'easy' | 'medium' | 'hard'
  tags            TEXT[] NOT NULL DEFAULT '{}',
  test_cases      JSONB NOT NULL,             -- [{input, expected_output, is_hidden}]
  time_limit_ms   INT NOT NULL DEFAULT 2000,
  memory_limit_mb INT NOT NULL DEFAULT 256,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON problems (difficulty);
CREATE INDEX ON problems USING GIN (tags);
```

### Matches

```sql
CREATE TABLE matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code   VARCHAR(8) UNIQUE,              -- null for public matches
  status      VARCHAR(16) NOT NULL DEFAULT 'waiting',
  mode        VARCHAR(16) NOT NULL DEFAULT 'public',
  problem_ids UUID[] NOT NULL DEFAULT '{}',
  max_players INT NOT NULL DEFAULT 4,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON matches (status);
```

### Match Players

```sql
CREATE TABLE match_players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  score           INT NOT NULL DEFAULT 0,
  ap              INT NOT NULL DEFAULT 0,
  problems_solved INT NOT NULL DEFAULT 0,
  placement       INT,                        -- set on match end
  elo_delta       INT,                        -- set on match end
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);
CREATE INDEX ON match_players (match_id);
CREATE INDEX ON match_players (user_id);
```

### Submissions

```sql
CREATE TABLE submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     UUID NOT NULL REFERENCES matches(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  problem_id   UUID NOT NULL REFERENCES problems(id),
  language     VARCHAR(32) NOT NULL,
  code         TEXT NOT NULL,
  status       VARCHAR(32) NOT NULL DEFAULT 'pending',
  runtime_ms   INT,
  memory_kb    INT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON submissions (match_id, user_id);
CREATE INDEX ON submissions (user_id, submitted_at DESC);
```

### Weapon Events

```sql
CREATE TABLE weapon_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES matches(id),
  attacker_id UUID NOT NULL REFERENCES users(id),
  target_id   UUID NOT NULL REFERENCES users(id),
  weapon_type VARCHAR(32) NOT NULL,
  ap_cost     INT NOT NULL,
  blocked     BOOLEAN NOT NULL DEFAULT FALSE,
  fired_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON weapon_events (match_id);
```

### Prisma Schema (excerpt)

```prisma
// packages/db/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String   @id @default(uuid())
  username   String   @unique @db.VarChar(32)
  email      String   @unique @db.VarChar(255)
  provider   String   @db.VarChar(16)
  providerId String   @db.VarChar(255)
  elo        Int      @default(1200)
  xp         Int      @default(0)
  rankTier   String   @default("bronze")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  matchPlayers MatchPlayer[]
  submissions  Submission[]
  attacks      WeaponEvent[] @relation("attacker")
  targeted     WeaponEvent[] @relation("target")

  @@unique([provider, providerId])
}
```

---

## Real-Time System

All in-match communication runs over **Socket.io rooms**. Each match gets a room named `match:{match_id}`. The Socket.io server uses **`@socket.io/redis-adapter`** so events broadcast on one ECS task reach clients connected to any other task.

### Events (server → client)

| Event | Payload | Description |
|---|---|---|
| `game:start` | `{ problems, players, duration }` | Match begins |
| `game:tick` | `{ timeRemaining }` | Clock sync every 5s |
| `game:end` | `{ leaderboard, eloDeltas }` | Match over |
| `player:solved` | `{ userId, problemIndex, timeTaken }` | Broadcast when someone solves |
| `player:score_update` | `{ userId, score, ap }` | Score/AP changed |
| `weapon:incoming` | `{ weaponType, attackerId, duration }` | You are being targeted |
| `weapon:effect_end` | `{ weaponType }` | Remove the visual effect |
| `weapon:blocked` | `{ weaponType, attackerId }` | Your shield blocked an attack |
| `lobby:player_joined` | `{ userId, username, elo }` | Pre-match lobby update |
| `lobby:player_left` | `{ userId }` | Player disconnected from lobby |

### Events (client → server)

| Event | Payload | Description |
|---|---|---|
| `player:ready` | `{}` | Player confirmed ready in lobby |
| `weapon:use` | `{ weaponType, targetId }` | Fire a weapon |
| `editor:cursor` | `{ line, column }` | Optional spectator cursor sharing |

### Socket.io Auth Middleware

```typescript
// apps/api/src/socket/middleware.ts
import { verifyJwt } from '../auth/jwt'

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('UNAUTHORIZED'))
  try {
    const payload = await verifyJwt(token)
    socket.data.userId = payload.sub
    socket.data.username = payload.username
    next()
  } catch {
    next(new Error('INVALID_TOKEN'))
  }
})
```

### Match State in Redis

Per-player state is stored in separate hashes to allow atomic `HINCRBY` operations without read-modify-write races:

```
Key: match:{matchId}:player:{userId}   TTL: match duration + 10min
{
  "score":       "250",
  "ap":          "120",
  "solved":      "[0,2]",
  "shield":      "false",
  "frozen":      "false",
  "frozenUntil": "0",
  "nukeUsed":    "false",
  "cooldowns":   "{\"freeze\":1713301234000}"
}
```

Match metadata lives separately:

```
Key: match:{matchId}:meta
{
  "status":     "active",
  "startedAt":  "1713300000000",
  "durationMs": "1800000",
  "problemIds": "[\"uuid1\",\"uuid2\"]"
}
```

---

## Code Execution Engine

### Submission Flow

```
Player submits code
      │
POST /api/v1/submit
      │
Validate: match active, player not frozen, rate limit OK
      │
Push job → BullMQ queue "submissions" (priority: normal)
      │
BullMQ worker picks up job
      │
      ├── Run visible test cases via Judge0  (~1s, fast feedback)
      │         └── Any fail → return wrong_answer, stop here
      │
      └── Run hidden test cases via Judge0  (scoring + complexity bonus)
                └── All pass → accepted
                      │
                      ├── Update Redis (score, ap, solved list) via pipeline
                      ├── Persist to submissions table (RDS)
                      └── Emit player:solved to match room (Socket.io)
```

### Judge0 Integration

```typescript
// apps/api/src/services/judge0.ts

const LANGUAGE_IDS: Record<string, number> = {
  python3:    71,
  javascript: 63,
  typescript: 74,
  java:       62,
  cpp17:      54,
  go:         60,
  rust:       73,
}

async function runTestCase(params: RunParams): Promise<Judge0Result> {
  const res = await fetch(`${process.env.JUDGE0_URL}/submissions?wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': process.env.JUDGE0_API_KEY!,
    },
    body: JSON.stringify({
      language_id:     LANGUAGE_IDS[params.language],
      source_code:     Buffer.from(params.code).toString('base64'),
      stdin:           Buffer.from(params.input).toString('base64'),
      expected_output: Buffer.from(params.expectedOutput).toString('base64'),
      cpu_time_limit:  params.timeLimitMs / 1000,
      memory_limit:    params.memoryLimitMb * 1024,
    }),
  })
  return res.json()
}
```

### Scoring Formula

```
base_score       = 100
speed_bonus      = max(0, 50 - floor(secondsSinceStart / 60))   // decays 1pt/min
first_solver     = +50  (only the first player to solve this problem)
complexity_bonus = +20  (hidden stress test passes within 2× optimal time)

score_gain = base_score + speed_bonus + first_solver
ap_earned  = 80 + speed_bonus + (first_solver ? 20 : 0)
```

---

## Weapon System

### Arsenal

| Weapon | AP Cost | Effect | Duration | Cooldown |
|---|---|---|---|---|
| Freeze | 80 | Target cannot submit | 20s | 60s |
| Screen Lock | 120 | Target's editor goes dark | 10s | 90s |
| Shuffle | 100 | Target's code lines scramble | instant | 45s |
| Mirage | 90 | Fake "Wrong Answer" on next submit | 1 trigger | 60s |
| Code Bomb | 70 | 5 random chars inserted into target's code | instant | 30s |
| Shield | 60 | Blocks the next incoming weapon | until hit | 120s |
| Time Warp | 50 | +30s added to your own timer | instant | 45s |
| Nuke ☢️ | 300 | Freezes ALL opponents for 15s | 15s | match-once |

### Server-Side Validation

```typescript
// apps/api/src/services/weaponEngine.ts

async function useWeapon(matchId: string, attackerId: string, targetId: string, weaponType: WeaponType) {
  const weapon = WEAPONS[weaponType]
  const aKey = `match:${matchId}:player:${attackerId}`
  const tKey = `match:${matchId}:player:${targetId}`

  // Atomic check: AP and cooldown
  const [ap, cooldownRaw] = await redis.hmGet(aKey, ['ap', `cooldown:${weaponType}`])
  if (Number(ap) < weapon.cost)              throw new AppError('INSUFFICIENT_AP', 422)
  if (Number(cooldownRaw) > Date.now())      throw new AppError('ON_COOLDOWN', 422)
  if (weaponType === 'nuke') {
    const nukeUsed = await redis.hGet(aKey, 'nukeUsed')
    if (nukeUsed === 'true')                 throw new AppError('NUKE_ALREADY_USED', 422)
  }

  // Shield check
  const shielded = await redis.hGet(tKey, 'shield')
  if (shielded === 'true') {
    await redis.hSet(tKey, 'shield', 'false')
    io.to(targetId).emit('weapon:blocked', { weaponType, attackerId })
    await db.weaponEvent.create({ data: { matchId, attackerId, targetId, weaponType, apCost: weapon.cost, blocked: true } })
    return
  }

  // Deduct AP and set cooldown atomically
  const pipeline = redis.multi()
  pipeline.hIncrBy(aKey, 'ap', -weapon.cost)
  pipeline.hSet(aKey, `cooldown:${weaponType}`, Date.now() + weapon.cooldownMs)
  if (weaponType === 'nuke') pipeline.hSet(aKey, 'nukeUsed', 'true')
  await pipeline.exec()

  await applyEffect(matchId, targetId, weaponType, weapon)
  await db.weaponEvent.create({ data: { matchId, attackerId, targetId, weaponType, apCost: weapon.cost, blocked: false } })

  io.to(targetId).emit('weapon:incoming', { weaponType, attackerId, duration: weapon.durationMs })
}
```

### Client-Side Effects (Monaco Editor)

```typescript
// apps/web/src/lib/weaponEffects.ts

export const applyWeaponEffect = (type: WeaponType, editor: monaco.editor.IStandaloneCodeEditor) => {
  switch (type) {
    case 'freeze':
      editor.updateOptions({ readOnly: true })
      setTimeout(() => editor.updateOptions({ readOnly: false }), 20_000)
      break

    case 'screen_lock': {
      const el = editor.getDomNode()?.parentElement
      if (!el) break
      const overlay = Object.assign(document.createElement('div'), {
        style: 'position:absolute;inset:0;background:#0a0a0a;z-index:50;border-radius:8px',
      })
      el.appendChild(overlay)
      setTimeout(() => overlay.remove(), 10_000)
      break
    }

    case 'shuffle': {
      const lines = editor.getValue().split('\n')
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]]
      }
      editor.setValue(lines.join('\n'))
      break
    }

    case 'code_bomb': {
      const model = editor.getModel()
      if (!model) break
      const line = Math.floor(Math.random() * model.getLineCount()) + 1
      const col  = model.getLineMaxColumn(line)
      const junk = Array.from({ length: 5 }, () =>
        String.fromCharCode(33 + Math.floor(Math.random() * 94))
      ).join('')
      editor.executeEdits('weapon:code_bomb', [{ range: new monaco.Range(line, col, line, col), text: junk }])
      break
    }
  }
}
```

---

## Matchmaking

### Public Queue (Redis sorted set)

Players enter `queue:ranked` scored by ELO. A worker runs every 5 seconds:

```typescript
// apps/api/src/workers/matchmaking.ts

async function tick() {
  const entries = await redis.zRangeWithScores('queue:ranked', 0, -1)
  // entries: [{ value: "userId|joinedAt", score: elo }, ...]

  const now = Date.now()
  const groups = groupByEloWindow(entries, {
    getWaitMs: (joinedAt: number) => now - joinedAt,
    baseWindow: 200,
    expansionPerSecond: 5,    // +5 ELO tolerance per extra second waiting
  })

  for (const group of groups) {
    if (group.length >= 2) {
      const players = group.slice(0, 4)
      await createMatch(players)
      await redis.zRem('queue:ranked', ...players.map(p => p.userId))
    }
  }
}
```

### Private Rooms

```
POST   /api/v1/rooms
       → 201 { roomCode: "XKCD42", matchId }

POST   /api/v1/rooms/:code/join
       → 200 { match, players }
       → Emits lobby:player_joined to room

POST   /api/v1/rooms/:code/start    (host only, requires >= 2 players)
       → 200 { match }
       → Emits game:start to room
```

### ELO Calculation

Multi-player: each player is compared pairwise against every other player. Delta is averaged.

```typescript
function eloExpected(a: number, b: number) {
  return 1 / (1 + 10 ** ((b - a) / 400))
}

function calcMatchDeltas(placements: { userId: string; elo: number }[]) {
  const deltas: Record<string, number> = {}
  for (const p of placements) {
    let total = 0
    for (const o of placements) {
      if (p.userId === o.userId) continue
      const won = placements.indexOf(p) < placements.indexOf(o)
      total += 32 * ((won ? 1 : 0) - eloExpected(p.elo, o.elo))
    }
    deltas[p.userId] = Math.round(total / (placements.length - 1))
  }
  return deltas
}
```

---

## Auth & OAuth

### Flow

```
1. User clicks "Sign in with GitHub"
2. Next.js → Auth.js redirects to GitHub /authorize
3. GitHub redirects back with ?code=...
4. Auth.js (server-side) exchanges code for access token
5. Auth.js fetches GitHub user profile
6. callbacks.signIn:
     - UPSERT user by (provider, providerId)  ← never duplicates on re-login
     - Embed userId + elo + username in JWT
7. JWT stored in HttpOnly, Secure, SameSite=Lax cookie (30-day expiry)
8. API requests automatically include cookie
9. Socket.io handshake sends JWT in auth.token field
```

### Auth.js Configuration

```typescript
// apps/web/src/auth.ts
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import { db } from '@code-arena/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (!profile?.email || !account) return false
      await db.user.upsert({
        where:  { provider_providerId: { provider: account.provider, providerId: String(profile.sub ?? profile.id) } },
        create: { provider: account.provider, providerId: String(profile.sub ?? profile.id),
                  email: profile.email, username: deriveUsername(profile), avatarUrl: profile.picture ?? profile.avatar_url },
        update: { avatarUrl: profile.picture ?? profile.avatar_url },
      })
      return true
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        const user = await db.user.findUnique({
          where: { provider_providerId: { provider: account.provider, providerId: String(profile.sub ?? profile.id) } },
        })
        token.userId   = user!.id
        token.elo      = user!.elo
        token.username = user!.username
      }
      return token
    },

    async session({ session, token }) {
      session.user.id       = token.userId as string
      session.user.elo      = token.elo as number
      session.user.username = token.username as string
      return session
    },
  },

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
})
```

### OAuth App Setup Checklist

**GitHub** (Settings → Developer Settings → OAuth Apps → New):
- Homepage URL: `https://codearena.gg`
- Callback URL: `https://codearena.gg/api/auth/callback/github`

**Google** (Cloud Console → Credentials → OAuth 2.0 Client ID):
- Authorized redirect URI: `https://codearena.gg/api/auth/callback/google`

**Store in AWS Secrets Manager** (injected into ECS task at runtime via `secrets` field in task definition):
```
/code-arena/prod/GITHUB_CLIENT_ID
/code-arena/prod/GITHUB_CLIENT_SECRET
/code-arena/prod/GOOGLE_CLIENT_ID
/code-arena/prod/GOOGLE_CLIENT_SECRET
/code-arena/prod/NEXTAUTH_SECRET
/code-arena/prod/DATABASE_URL
/code-arena/prod/REDIS_URL
/code-arena/prod/JUDGE0_API_KEY
```

ECS task IAM role has `secretsmanager:GetSecretValue` scoped to `/code-arena/prod/*` only.

### Rate Limiting (Redis Sliding Window)

```typescript
async function rateLimit(userId: string, action: string, limit: number, windowMs: number) {
  const key = `rl:${action}:${userId}`
  const now = Date.now()
  await redis.zRemRangeByScore(key, 0, now - windowMs)
  const count = await redis.zCard(key)
  if (count >= limit) throw new AppError('RATE_LIMIT_EXCEEDED', 429)
  await redis.zAdd(key, { score: now, value: String(now) })
  await redis.expire(key, Math.ceil(windowMs / 1000))
}

// Limits
// Submissions:    10/min per user
// Matchmaking:    5/min  per user
// Weapon use:     20/min per user (belt-and-suspenders; cooldown is primary enforcement)
```

---

## API Design

### Base URL: `/api/v1`

All routes except `/auth/*` require a valid session cookie. All responses use the shape `{ data }` on success and `{ error: { code, message, statusCode } }` on failure.

#### Auth
```
GET  /auth/signin/github              Redirect to GitHub OAuth
GET  /auth/signin/google              Redirect to Google OAuth
GET  /auth/callback/:provider         OAuth callback (Auth.js)
POST /auth/signout                    Clear session cookie
GET  /auth/session                    { user: { id, username, elo, rankTier } }
```

#### Users
```
GET   /users/:id                      Public profile
GET   /users/:id/history              Paginated match history  ?page=1&limit=20
GET   /users/me                       Own full profile
PATCH /users/me                       Update { username?, avatarUrl? }
```

#### Problems
```
GET  /problems                        List  ?difficulty=medium&tags=dp,graphs&page=1
GET  /problems/:slug                  Problem detail (no hidden test cases exposed)
```

#### Matches
```
POST   /matches/queue                 Join public ranked queue
DELETE /matches/queue                 Leave queue
GET    /matches/queue/status          Your position + estimated wait time
POST   /matches/rooms                 Create private room → { roomCode }
POST   /matches/rooms/:code/join      Join private room
POST   /matches/rooms/:code/start     Start match (host only, >= 2 players)
GET    /matches/:id                   Match result + replay  (only after match ends)
```

#### Submissions
```
POST  /submit                         { matchId, problemId, language, code }
GET   /submit/:id                     Submission status + test case results
```

#### Leaderboard
```
GET  /leaderboard                     Top 100 by ELO  ?tier=gold
GET  /leaderboard/weekly              Top 100 by XP gained this week
```

---

## CI/CD Pipeline

### Monorepo Structure

```
code-arena/
├── apps/
│   ├── web/              Next.js (→ AWS Amplify)
│   └── api/              Express + Socket.io (→ ECS via ECR)
├── packages/
│   ├── types/            Shared TypeScript types
│   └── db/               Prisma schema + client
├── infra/
│   └── terraform/        VPC, ECS, RDS, ElastiCache, S3, CloudFront IaC
├── .github/
│   └── workflows/
│       ├── ci.yml        PR checks
│       └── deploy.yml    Deploy on merge to main
└── pnpm-workspace.yaml
```

### GitHub Actions — CI (on every PR)

```yaml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: codearena_test }
        ports: ['5432:5432']

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm --filter db prisma validate
      - run: pnpm --filter db prisma migrate deploy
        env: { DATABASE_URL: postgresql://postgres:test@localhost:5432/codearena_test }
      - run: pnpm test
```

### GitHub Actions — Deploy (on merge to main)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    permissions:
      id-token: write    # OIDC — no stored AWS access keys
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/github-actions-deploy
          aws-region: us-east-1

      - name: Login to ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        run: |
          IMAGE=${{ steps.ecr.outputs.registry }}/code-arena-api:${{ github.sha }}
          docker build -t $IMAGE ./apps/api
          docker push $IMAGE
          echo "IMAGE=$IMAGE" >> $GITHUB_ENV

      - name: Run DB migrations (one-off ECS task)
        run: |
          aws ecs run-task \
            --cluster code-arena-prod \
            --task-definition code-arena-migrate \
            --network-configuration "awsvpcConfiguration={subnets=[${{ vars.PRIVATE_SUBNET_IDS }}],securityGroups=[${{ vars.ECS_SG_ID }}]}" \
            --overrides "{\"containerOverrides\":[{\"name\":\"api\",\"command\":[\"npx\",\"prisma\",\"migrate\",\"deploy\"],\"environment\":[{\"name\":\"IMAGE_TAG\",\"value\":\"${{ github.sha }}\"}]}]}" \
            --launch-type FARGATE

      - name: Deploy new ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: infra/ecs-task-def.json
          service: code-arena-api
          cluster: code-arena-prod
          image: ${{ env.IMAGE }}
          wait-for-service-stability: true

  deploy-web:
    runs-on: ubuntu-latest
    needs: deploy-api   # deploy API first so schema is migrated
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/github-actions-deploy
          aws-region: us-east-1
      - name: Trigger Amplify build
        run: |
          aws amplify start-job \
            --app-id ${{ vars.AMPLIFY_APP_ID }} \
            --branch-name main \
            --job-type RELEASE
```

### Dockerfile (API)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
```

---

## Scalability Considerations

### Horizontal ECS Scaling

All match state lives in ElastiCache, so ECS tasks are stateless and can be scaled freely. Socket.io uses the Redis adapter to fan out events across all tasks:

```typescript
import { createAdapter } from '@socket.io/redis-adapter'

const pub = createClient({ url: process.env.REDIS_URL })
const sub = pub.duplicate()
await Promise.all([pub.connect(), sub.connect()])
io.adapter(createAdapter(pub, sub))
```

ALB sticky sessions (`AWSALB` cookie, 30-min TTL) keep Socket.io reconnects landing on the same task — this reduces cross-task pub/sub chatter without being required for correctness.

### Judge0 Horizontal Scaling

At high load, run multiple Judge0 workers behind an **internal ALB** (not internet-facing) within the isolated subnet. BullMQ handles backpressure gracefully — submissions queue up rather than timing out when Judge0 is saturated.

### Database Scaling

- RDS read replica for leaderboard + match history queries (write to primary, read from replica)
- Indexes on all foreign key columns and high-cardinality filter columns
- Prisma `$transaction` for match-end writes (placements, ELO, XP) to prevent partial state
- S3 archive + RDS purge for matches older than 90 days

### Future: Dedicated Game Server Fleet

At scale (~10k+ concurrent matches), extract Socket.io into its own ECS service. REST API handles auth and DB writes; game servers only read/write Redis and emit events. Independent auto-scaling for each concern.

---

## Cost Estimate

Monthly estimate for moderate production scale (~1,000 DAU, ~200 concurrent matches peak):

| Service | Spec | Est. Monthly |
|---|---|---|
| ECS Fargate | 2 tasks × 0.5 vCPU / 1 GB, ~730h | ~$30 |
| RDS PostgreSQL | db.t3.medium, Multi-AZ, 100 GB gp3 | ~$80 |
| ElastiCache Redis | cache.t3.medium + 1 replica | ~$60 |
| EC2 Judge0 | c5.xlarge, on-demand | ~$120 |
| ALB | ~1M LCUs/month | ~$20 |
| S3 + CloudFront | 50 GB storage, 1 TB egress | ~$25 |
| AWS Amplify | build minutes + hosting | ~$5 |
| Secrets Manager | ~10 secrets | ~$2 |
| CloudWatch + Sentry | logs + error tracking | ~$15 |
| Route 53 | 1 hosted zone + queries | ~$3 |
| **Total** | | **~$360/month** |

> **Cost tip:** Judge0 EC2 is the single biggest line item. During early development, use the [hosted Judge0 API](https://judge0.com) (~$29/month) to avoid running an EC2. Swap to self-hosted once you need predictable latency and volume.

---

*Last updated: April 2026 — v1.2 (Node.js + AWS + GitHub/Google OAuth)*