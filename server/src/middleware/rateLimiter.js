import { rateLimit } from 'express-rate-limit'
import { config } from '../config/env.js'

function limitHandler(_req, res, _next, options) {
  res.status(options.statusCode).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait before trying again.',
    },
  })
}

/** Broad API limiter. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitHandler,
})

/** Expensive scan endpoint: strict per-IP limit. */
export const scanLimiter = rateLimit({
  windowMs: config.scanRateLimitWindowMs,
  limit: config.scanRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitHandler,
  skip: () => config.isTest,
})
