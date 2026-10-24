import { AppError } from './errors.js'

/** Simple in-process concurrency gate for expensive scans. */
export function createSemaphore(limit) {
  const max = Math.max(1, Number(limit) || 1)
  let active = 0

  return {
    limit: max,
    get active() {
      return active
    },
    get available() {
      return Math.max(0, max - active)
    },
    tryAcquire() {
      if (active >= max) return false
      active += 1
      return true
    },
    release() {
      if (active > 0) active -= 1
    },
  }
}

/**
 * Reject a promise that takes too long. The underlying work is expected to
 * have its own cleanup path; this is a last-resort request guard.
 */
export async function withTimeout(promise, ms, { code = 'SCAN_TIMEOUT', message = 'The scan took too long to complete.' } = {}) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new AppError(code, message, { statusCode: 504 }))
    }, Math.max(1, ms))
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

/** Track a per-scan deadline and expose the remaining budget. */
export function createDeadline(timeoutMs) {
  const expiresAt = Date.now() + Math.max(0, timeoutMs)
  return {
    expiresAt,
    remaining() {
      return Math.max(0, expiresAt - Date.now())
    },
    expired() {
      return Date.now() >= expiresAt
    },
  }
}

/** Bounded, de-duplicated push helper used by scanners that cap collections. */
export function pushLimited(target, value, limit) {
  if (target.length >= limit) return false
  target.push(value)
  return true
}
