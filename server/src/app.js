import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { config } from './config/env.js'
import { healthRouter } from './routes/health.routes.js'
import { scanRouter } from './routes/scan.routes.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { AppError } from './utils/errors.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')

  // Vercel serverless functions always run behind Vercel's edge proxy, which
  // sets `X-Forwarded-For`. When `trust proxy` is disabled (Express default),
  // express-rate-limit v7 rejects every request with
  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and the API answers with a 500.
  //
  // Exactly one hop is trusted (never `true`), so the client address is taken
  // from the entry that Vercel itself appended. A caller cannot spoof its IP
  // by sending its own X-Forwarded-For chain.
  //
  // `config.trustProxy` defaults to enabled on Vercel/Lambda and can be
  // overridden with TRUST_PROXY=true|false.
  app.set('trust proxy', config.trustProxy ? 1 : false)
  console.log(`[app] trust proxy: ${config.trustProxy ? 'enabled (1 hop)' : 'disabled'}`)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  app.use(
    cors({
      origin(origin, callback) {
        // Non-browser clients (curl, server-to-server) send no Origin.
        if (!origin) return callback(null, true)
        // In same-domain or serverless environments, allow same origin or configured origins
        if (config.clientOrigins.includes('*') || config.clientOrigins.includes(origin)) return callback(null, true)
        // If clientOrigins includes a wildcard or origin matches Vercel deployment URL
        if (process.env.VERCEL && origin.endsWith('.vercel.app')) return callback(null, true)
        return callback(new AppError('CORS_NOT_ALLOWED', 'This origin is not allowed to call the API.', { statusCode: 403 }))
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      maxAge: 86400,
    }),
  )

  app.use(express.json({ limit: '16kb', strict: true }))

  app.use('/api', apiLimiter)
  app.use('/api/health', healthRouter)
  app.use('/api/scans', scanRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
