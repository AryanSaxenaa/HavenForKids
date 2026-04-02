import rateLimit from 'express-rate-limit'

export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 chat requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
})

export const sessionRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // 10 session creations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many session requests.' },
})

export const dashboardRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 dashboard loads per minute per IP (Mistral call per request)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many dashboard requests.' },
})

export const defaultRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
})
