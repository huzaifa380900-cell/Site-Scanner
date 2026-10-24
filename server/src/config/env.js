import 'dotenv/config'

/**
 * Central runtime configuration.
 * Only values that are safe for the frontend may be exposed through the API.
 */
function intFromEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value < min || value > max) return fallback
  return value
}

function boolFromEnv(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

function portsFromEnv(name, fallback) {
  const raw = process.env[name]
  if (!raw) return new Set(fallback)
  const parsed = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((port) => Number.isInteger(port) && port > 0 && port <= 65535)
  // 80/443 are always required for ordinary web scanning.
  return new Set(parsed.length ? parsed : fallback)
}

const nodeEnv = process.env.NODE_ENV || 'development'

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: intFromEnv('PORT', 5000, { min: 1, max: 65535 }),
  mongoUri: process.env.MONGODB_URI || '',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  appVersion: process.env.APP_VERSION || '1.0.0',
  scanTimeoutMs: intFromEnv('SCAN_TIMEOUT_MS', 30000, { min: 3000, max: 120000 }),
  navigationTimeoutMs: intFromEnv('NAVIGATION_TIMEOUT_MS', 20000, { min: 3000, max: 90000 }),
  maxScanConcurrency: intFromEnv('MAX_SCAN_CONCURRENCY', 2, { min: 1, max: 10 }),
  maxRedirects: intFromEnv('MAX_REDIRECTS', 5, { min: 0, max: 10 }),
  maxResponseBytes: intFromEnv('MAX_RESPONSE_BYTES', 2 * 1024 * 1024, { min: 1024, max: 10 * 1024 * 1024 }),
  browserScanEnabled: boolFromEnv('BROWSER_SCAN_ENABLED', true),
  checkLinks: boolFromEnv('CHECK_LINKS', true),
  maxLinkChecks: intFromEnv('MAX_LINK_CHECKS', 5, { min: 0, max: 15 }),
  allowedPorts: portsFromEnv('ALLOWED_SCAN_PORTS', [80, 443, 8080, 8443]),
  scanRateLimitMax: intFromEnv('SCAN_RATE_LIMIT_MAX', 5, { min: 1, max: 200 }),
  scanRateLimitWindowMs: intFromEnv('SCAN_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000, { min: 10000, max: 3600000 }),

  // Link checks are intentionally capped so a single scan cannot crawl a site.
  linkCheckTimeoutMs: 5000,
  dnsCacheTtlMs: 30000,
}
