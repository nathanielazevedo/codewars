import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { setupSocket } from './socket.js'
import { startMatchmaker } from './matchmaker.js'

const PORT = Number(process.env.PORT) || Number(process.env.API_PORT) || 3001
const WEB_ORIGIN = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

const app = express()
app.use(cors({ origin: WEB_ORIGIN, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() })
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: WEB_ORIGIN, credentials: true },
})

setupSocket(io)
startMatchmaker()

httpServer.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
})
