import http from 'node:http'
import https from 'node:https'
import { performance } from 'node:perf_hooks'
import zlib from 'node:zlib'
import { config } from '../config/env.js'
import { AppError } from '../utils/errors.js'
import { createPinnedLookup } from './pinnedLookup.js'
import { SsrfError, validateTargetUrl } from './ssrfProtection.js'

/**
 * Controlled HTTP transport.
 *
 * - Redirects are followed manually; every hop is revalidated by the SSRF
 *   policy before a socket is opened.
 * - DNS is pinned through a custom `lookup`, so the TCP connection can only go
 *   to addresses that passed validation.
 * - Response size, total request time and redirect count are bounded.
 * - The target never receives application cookies or credentials.
 */

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const TLS_ERROR_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_UNTRUSTED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'EPROTO',
])

export function isHtmlContentType(contentType = '') {
  const value = String(contentType).toLowerCase()
  return value.includes('text/html') || value.includes('application/xhtml+xml')
}

export function isRedirectStatus(statusCode) {
  return REDIRECT_STATUSES.has(statusCode)
}

function mapNetworkError(error, timeoutMs) {
  if (error instanceof AppError) return error
  const code = error?.code || ''

  if (TLS_ERROR_CODES.has(code) || /certificate|TLS|SSL/i.test(error?.message || '')) {
    return new AppError('TLS_ERROR', 'The website HTTPS certificate could not be verified.', {
      statusCode: 502,
      cause: error,
    })
  }

  switch (code) {
    case 'ETIMEDOUT':
    case 'ESOCKETTIMEDOUT':
      return new AppError('TARGET_TIMEOUT', `The website did not respond within ${Math.round(timeoutMs / 1000)} seconds.`, {
        statusCode: 504,
        cause: error,
      })
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return new AppError('DNS_RESOLUTION_FAILED', 'The website hostname could not be resolved.', {
        statusCode: 502,
        cause: error,
      })
    case 'ECONNREFUSED':
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
    case 'ECONNRESET':
      return new AppError('TARGET_UNREACHABLE', 'The website could not be reached.', {
        statusCode: 502,
        cause: error,
      })
    case 'HPE_INVALID_CONSTANT':
    case 'HPE_INVALID_HEADER_TOKEN':
    case 'HPE_INVALID_STATUS':
      return new AppError('INVALID_RESPONSE', 'The website returned an invalid HTTP response.', {
        statusCode: 502,
        cause: error,
      })
    default:
      return new AppError('TARGET_UNREACHABLE', 'The website could not be reached.', {
        statusCode: 502,
        cause: error,
      })
  }
}

function createDecoder(contentEncoding) {
  const encoding = String(contentEncoding || '').toLowerCase().trim()
  if (!encoding || encoding === 'identity') return null
  if (encoding === 'gzip' || encoding === 'x-gzip') return zlib.createGunzip()
  if (encoding === 'deflate') return zlib.createInflate()
  if (encoding === 'br') return zlib.createBrotliDecompress()
  return null
}

function selectedHeaders(headers) {
  const result = {}
  for (const [key, value] of Object.entries(headers)) {
    if (key === 'set-cookie' || key === 'proxy-authenticate' || key === 'proxy-authorization') continue
    result[key] = Array.isArray(value) ? value.join(', ') : value
  }
  return result
}

/**
 * Perform a single HTTP request to a validated destination. Exported for tests.
 */
export async function performRequest(validated, options = {}) {
  const {
    method = 'GET',
    timeoutMs = config.scanTimeoutMs,
    maxBytes = config.maxResponseBytes,
    extraHeaders = {},
    readBody = true,
  } = options

  const transport = validated.protocol === 'https:' ? https : http
  const parsedUrl = new URL(validated.url)
  const pinnedAddresses = validated.addresses
  if (!Array.isArray(pinnedAddresses) || pinnedAddresses.length === 0) {
    throw new AppError('SSRF_VALIDATION_FAILED', 'The destination could not be validated.', { statusCode: 400 })
  }

  const agent = new transport.Agent({
    lookup: createPinnedLookup(pinnedAddresses),
    keepAlive: false,
    maxSockets: 1,
  })

  const requestHeaders = {
    host: validated.hostHeader || parsedUrl.host,
    'user-agent': 'SiteScanner/1.0 (passive website analysis)',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5',
    'accept-language': 'en-US,en;q=0.8',
    'accept-encoding': 'gzip, deflate, br',
    connection: 'close',
    ...extraHeaders,
  }

  const startedAt = performance.now()
  let timer = null
  let request = null
  let responseRef = null
  let timedOut = false

  const timeoutError = new AppError(
    'TARGET_TIMEOUT',
    `The website did not respond within ${Math.round(timeoutMs / 1000)} seconds.`,
    { statusCode: 504 },
  )

  try {
    const response = await new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        const error = timeoutError
        timedOut = true
        try {
          if (responseRef) responseRef.destroy(error)
          request?.destroy(error)
        } catch {
          /* already closed */
        }
        reject(error)
      }, timeoutMs)

      try {
        request = transport.request(
          {
            protocol: parsedUrl.protocol,
            // For literal IPs this is the canonical validated address; for
            // hostnames the pinned lookup guarantees the same result.
            hostname: validated.hostname,
            port: validated.port,
            path: `${parsedUrl.pathname}${parsedUrl.search}`,
            method,
            agent,
            headers: requestHeaders,
            servername: validated.protocol === 'https:' && !validated.isIpLiteral ? validated.hostname : undefined,
            rejectUnauthorized: true,
          },
          (res) => {
            responseRef = res
            resolve(res)
          },
        )
      } catch (error) {
        reject(mapNetworkError(error, timeoutMs))
        return
      }

      request.on('error', (error) => reject(mapNetworkError(error, timeoutMs)))
      request.end()
    })

    const statusCode = response.statusCode || 0
    response.on('error', () => {})
    const headers = selectedHeaders(response.headers)
    const ttfbMs = Math.round(performance.now() - startedAt)
    const contentType = headers['content-type'] || ''
    const contentLength = Number(headers['content-length'])

    // Redirects, HEAD replies and non-HTML responses do not need their bodies.
    const bodyWanted =
      readBody &&
      method !== 'HEAD' &&
      !isRedirectStatus(statusCode) &&
      (contentType === '' || isHtmlContentType(contentType) || contentType.includes('application/xml'))

    if (bodyWanted && Number.isFinite(contentLength) && contentLength > maxBytes) {
      response.destroy()
      throw new AppError('OVERSIZED_RESPONSE', 'The website response is too large to analyze safely.', {
        statusCode: 502,
      })
    }

    let body = null
    let bodyBytes = 0
    let bodyTruncated = false

    if (bodyWanted) {
      const decoder = createDecoder(headers['content-encoding'])
      const stream = decoder ? response.pipe(decoder) : response
      const chunks = []

      response.on('error', () => {})
      stream.on('error', () => {})

      try {
        for await (const chunk of stream) {
          bodyBytes += chunk.length
          if (bodyBytes > maxBytes) {
            bodyTruncated = true
            response.destroy()
            stream.destroy()
            throw new AppError('OVERSIZED_RESPONSE', 'The website response is too large to analyze safely.', {
              statusCode: 502,
            })
          }
          chunks.push(chunk)
        }
      } catch (error) {
        if (error instanceof AppError) throw error
        if (timedOut) throw timeoutError
        throw mapNetworkError(error, timeoutMs)
      }
      body = Buffer.concat(chunks)
    } else {
      // Drain/close without buffering the payload.
      response.destroy()
    }

    return {
      statusCode,
      statusMessage: response.statusMessage || '',
      headers,
      body,
      bodyBytes,
      bodyTruncated,
      contentType,
      contentEncoding: headers['content-encoding'] || '',
      ttfbMs,
      totalMs: Math.round(performance.now() - startedAt),
    }
  } finally {
    if (timer) clearTimeout(timer)
    try {
      request?.destroy()
    } catch {
      /* noop */
    }
    agent.destroy()
  }
}

function resolveRedirectLocation(location, baseUrl) {
  if (!location) {
    throw new AppError('INVALID_REDIRECT', 'The website returned an invalid redirect.', { statusCode: 502 })
  }
  let next
  try {
    next = new URL(location, baseUrl)
  } catch {
    throw new AppError('INVALID_REDIRECT', 'The website returned an invalid redirect.', { statusCode: 502 })
  }
  if (next.protocol !== 'http:' && next.protocol !== 'https:') {
    throw new SsrfError('UNSUPPORTED_PROTOCOL', 'The website redirected to an unsupported protocol.', {
      statusCode: 502,
    })
  }
  next.hash = ''
  return next.href
}

/**
 * Fetch a page, following redirects only after validating every destination.
 *
 * @param {string} rawUrl
 * @param {object} [options]
 * @param {number} [options.maxRedirects]
 * @param {number} [options.timeoutMs] per-hop timeout
 * @param {number} [options.maxBytes]
 * @param {Map} [options.dnsCache]
 * @param {Function} [options.resolveDns]
 * @param {Function} [options.perform] injectable transport for tests
 */
export async function fetchPage(rawUrl, options = {}) {
  const {
    maxRedirects = config.maxRedirects,
    timeoutMs = config.scanTimeoutMs,
    maxBytes = config.maxResponseBytes,
    method = 'GET',
    extraHeaders = {},
    dnsCache = new Map(),
    resolveDns,
    perform = performRequest,
    readBody = true,
  } = options

  const redirects = []
  const seen = new Set()
  let currentUrl = rawUrl

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const validated = await validateTargetUrl(currentUrl, {
      dnsCache,
      ...(resolveDns ? { resolveDns } : {}),
    })

    seen.add(validated.url.toLowerCase())

    const response = await perform(validated, {
      method,
      timeoutMs,
      maxBytes,
      extraHeaders,
      readBody,
    })

    if (isRedirectStatus(response.statusCode) && response.headers.location) {
      if (redirects.length >= maxRedirects) {
        throw new AppError('TOO_MANY_REDIRECTS', 'The website redirected too many times.', {
          statusCode: 502,
        })
      }

      const nextUrl = resolveRedirectLocation(response.headers.location, validated.url)
      if (seen.has(nextUrl.toLowerCase())) {
        throw new AppError('REDIRECT_LOOP', 'The website redirect looped and could not be analyzed.', {
          statusCode: 502,
        })
      }

      redirects.push({ from: validated.url, to: nextUrl, statusCode: response.statusCode })
      currentUrl = nextUrl
      continue
    }

    return {
      requestedUrl: rawUrl,
      finalUrl: validated.url,
      originUrl: validated.url,
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      headers: response.headers,
      contentType: response.contentType,
      contentEncoding: response.contentEncoding,
      body: response.body,
      bodyBytes: response.bodyBytes,
      bodyTruncated: response.bodyTruncated,
      ttfbMs: response.ttfbMs,
      totalMs: response.totalMs,
      redirects,
      isHtml: isHtmlContentType(response.contentType),
    }
  }

  throw new AppError('TOO_MANY_REDIRECTS', 'The website redirected too many times.', { statusCode: 502 })
}
