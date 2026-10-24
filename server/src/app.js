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
  if (process.env.TRUST_PROXY === 'true') {
    // Only enable behind a known reverse proxy you control.
    app.set('trust proxy', 1)
  }

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
        if (config.clientOrigins.includes(origin)) return callback(null, true)
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
