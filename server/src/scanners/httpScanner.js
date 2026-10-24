import { config } from '../config/env.js'
import { fetchPage, isHtmlContentType } from '../security/safeHttpClient.js'
import { AppError } from '../utils/errors.js'

/**
 * Stage 2 — controlled HTTP fetch of the main document.
 * Redirects are already validated by `fetchPage`; this layer enforces the
 * content-type and body requirements for HTML analysis.
 */
export async function scanHttp(url, { deadline } = {}) {
  const remaining = deadline ? deadline.remaining() : config.scanTimeoutMs
  if (remaining < 3000) {
    throw new AppError('SCAN_TIMEOUT', 'The scan did not have enough time to fetch the page.', { statusCode: 504 })
  }

  const timeoutMs = Math.max(3000, Math.min(15000, remaining - 3000))

  const result = await fetchPage(url, {
    timeoutMs,
    maxBytes: config.maxResponseBytes,
    maxRedirects: config.maxRedirects,
  })

  if (!result.isHtml) {
    const type = result.contentType || 'an unknown content type'
    throw new AppError(
      'UNSUPPORTED_CONTENT_TYPE',
      `The page returned ${type.split(';')[0]} instead of HTML, so it cannot be analysed as a website.`,
      { statusCode: 422 },
    )
  }

  if (!result.body || result.body.length === 0) {
    throw new AppError('EMPTY_RESPONSE', 'The website returned an empty response body.', { statusCode: 502 })
  }

  const html = decodeBody(result.body, result.contentType)

  const http = {
    requestedUrl: result.requestedUrl,
    finalUrl: result.finalUrl,
    statusCode: result.statusCode,
    statusMessage: result.statusMessage,
    contentType: result.contentType,
    contentEncoding: result.contentEncoding,
    responseTimeMs: result.totalMs,
    ttfbMs: result.ttfbMs,
    bodyBytes: result.bodyBytes,
    https: result.finalUrl.startsWith('https://'),
    headers: trimHeaders(result.headers),
    redirects: result.redirects,
  }

  return { http, html }
}

function decodeBody(buffer, contentType) {
  let charset = 'utf-8'
  const match = /charset=["']?([\w-]+)/i.exec(String(contentType || ''))
  if (match) charset = match[1]
  try {
    return new TextDecoder(charset).decode(buffer)
  } catch {
    return buffer.toString('utf8')
  }
}

function trimHeaders(headers) {
  const trimmed = {}
  for (const [key, value] of Object.entries(headers || {})) {
    if (key === 'set-cookie') continue
    trimmed[key] = String(value).slice(0, 1000)
  }
  return trimmed
}

/**
 * Bounded internal link checking. Only same-origin links discovered on the
 * submitted page are checked, at most `MAX_LINK_CHECKS`, and only while the
 * scan deadline allows. No crawling of discovered pages is performed.
 */
export async function checkInternalLinks(page, { deadline } = {}) {
  const summary = { checked: 0, broken: [], skipped: 0, candidates: 0 }
  if (!config.checkLinks || !page?.links?.internal?.length) return summary

  const candidates = page.links.internal
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, config.maxLinkChecks)
  summary.candidates = candidates.length

  for (const url of candidates) {
    if (deadline && deadline.remaining() < 4000) {
      summary.skipped += 1
      continue
    }

    try {
      let response = await fetchPage(url, {
        method: 'HEAD',
        timeoutMs: Math.min(config.linkCheckTimeoutMs, deadline ? Math.max(2000, deadline.remaining() - 2000) : 5000),
        maxBytes: 4096,
        maxRedirects: 2,
        readBody: false,
      })

      // Some servers do not implement HEAD; retry once with a bodyless GET.
      if (response.statusCode === 405 || response.statusCode === 501) {
        response = await fetchPage(url, {
          method: 'GET',
          timeoutMs: Math.min(config.linkCheckTimeoutMs, deadline ? Math.max(2000, deadline.remaining() - 2000) : 5000),
          maxBytes: 4096,
          maxRedirects: 2,
          readBody: false,
        })
      }

      summary.checked += 1
      if (response.statusCode === 404 || response.statusCode === 410 || response.statusCode >= 500) {
        summary.broken.push({ url, statusCode: response.statusCode })
      } else if (response.statusCode >= 400) {
        // 401/403/429 usually mean the link exists but is protected or rate
        // limited. Do not report it as broken without stronger evidence.
        summary.skipped += 1
      }
    } catch (error) {
      // Blocked/unsafe link targets are reported as skipped, never contacted.
      if (['TARGET_NOT_ALLOWED', 'BLOCKED_HOSTNAME', 'PROHIBITED_ADDRESS', 'PORT_NOT_ALLOWED'].includes(error?.code)) {
        summary.skipped += 1
        continue
      }
      summary.checked += 1
      summary.broken.push({ url, statusCode: null, error: error?.code || 'UNREACHABLE' })
    }
  }

  return summary
}
