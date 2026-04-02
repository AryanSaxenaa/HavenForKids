import 'dotenv/config'
import { env } from './config/env'
import express, { type Request, type Response, type NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { logger } from './utils/logger'
import { migrate } from './db/migrate'
import { sessionRouter } from './routes/session'
import { chatRouter, conversationRouter } from './routes/chat'
import { dashboardRouter } from './routes/dashboard'
import { defaultRateLimit } from './middleware/rateLimit'

const app = express()

// ── Security headers ──────────────────────────────────────────────
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server) in dev
      if (!origin) return callback(null, true)
      // Allow any localhost port in development
      if (env.NODE_ENV === 'development' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true)
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error(`CORS: Origin '${origin}' not allowed`))
    },
    credentials: true,
  }),
)

// ── HTTP request logging ───────────────────────────────────────────
app.use(pinoHttp({ logger }))

// ── Body parsing ──────────────────────────────────────────────────
// 50kb to safely accommodate full conversation history (up to 50 items × 2000 chars each)
app.use(express.json({ limit: '50kb' }))

// ── Default rate limit ────────────────────────────────────────────
app.use(defaultRateLimit)

// ── Health check ──────────────────────────────────────────────────
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/v1/session', sessionRouter)
app.use('/api/v1/chat', chatRouter)
app.use('/api/v1/conversation', conversationRouter)
app.use('/api/v1/dashboard', dashboardRouter)

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && err.message.startsWith('CORS')) {
    res.status(403).json({ error: err.message })
    return
  }
  logger.error({ err }, 'Unhandled server error')
  res.status(500).json({ error: 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────────
migrate()
  .then(() => {
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, '🌿 HAVEN server running')
    })
  })
  .catch((err) => {
    logger.error({ err }, 'DB migration failed — server will not start')
    process.exit(1)
  })

export default app
