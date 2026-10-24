import { AppError, isAppError } from '../utils/errors.js'

/** Wrap async route handlers so rejected promises reach the error middleware. */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint does not exist.',
    },
  })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' },
    })
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' },
    })
  }

  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      console.error(`[api] ${req.method} ${req.path} failed: ${error.code}`)
    }
    return res.status(error.statusCode).json(error.toPublicJSON())
  }

  // Never leak stack traces or driver messages to clients.
  console.error(`[api] Unhandled error on ${req.method} ${req.path}:`, error)
  return res.status(500).json(new AppError('INTERNAL_ERROR', 'An unexpected server error occurred.').toPublicJSON())
}
