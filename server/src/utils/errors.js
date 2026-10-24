/**
 * Application-level error with a stable machine code and a deliberately
 * generic public message. Internal details (addresses, stack traces, DNS
 * infrastructure) are never serialized to API clients.
 */
export class AppError extends Error {
  constructor(code, message, { statusCode = 500, details = undefined, expose = true, cause } = {}) {
    super(message, { cause })
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.expose = expose
    this.isOperational = true
  }

  toPublicJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.expose ? this.message : 'The request could not be completed.',
        ...(this.details ? { details: this.details } : {}),
      },
    }
  }
}

export function isAppError(error) {
  return error instanceof AppError || error?.isOperational === true
}

export function toAppError(error, fallbackCode = 'INTERNAL_ERROR', fallbackMessage = 'Something went wrong while processing the request.') {
  if (isAppError(error)) return error
  return new AppError(fallbackCode, fallbackMessage, { expose: false, cause: error })
}
