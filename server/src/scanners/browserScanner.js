import { chromium } from 'playwright'
import { config } from '../config/env.js'
import { createBrowserRequestHandler } from '../security/browserRequestHandler.js'
import { startEgressProxy } from '../security/egressProxy.js'
import { createRequestGuard, redactUrlForLog, validateTargetUrl } from '../security/ssrfProtection.js'
import { pushLimited } from '../utils/scanLimits.js'

/**
 * Headless Chromium analysis with two independent SSRF enforcement layers:
 *
 * 1. Playwright request interception validates every subresource, navigation,
 *    iframe, XHR and favicon request through the shared policy.
 * 2. Chromium is forced through the loopback egress proxy, which performs its
 *    own DNS resolution and connects only to validated IP addresses. This is
 *    the network boundary: even if interception missed a request, the proxy
 *    still refuses private destinations and pins public connections.
 *
 * WebSockets and protocol upgrades are blocked during scans. Downloads,
 * popups and service workers are disabled; no existing browser profile,
 * cookies or credentials are used.
 */

function resourceScope(url, targetUrl) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const targetHost = new URL(targetUrl).hostname.replace(/^www\./, '')
    return host === targetHost ? 'same-origin' : 'third-party'
  } catch {
    return 'unknown'
  }
}

function sanitizeFailureText(text) {
  return String(text || 'Request failed')
    .replace(/\/[A-Za-z]:\\[^\s)]+/g, '[local path]')
    .slice(0, 200)
}

function safeBrowserEnv() {
  // Chromium must not inherit application secrets such as MONGODB_URI.
  const allow = ['PATH', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'HOME', 'LANG', 'LC_ALL']
  const env = {}
  for (const key of allow) {
    if (process.env[key]) env[key] = process.env[key]
  }
  return env
}

/**
 * @param {string} targetUrl URL already accepted by the scan pipeline
 * @param {object} [options]
 * @param {ReturnType<import('../utils/scanLimits.js').createDeadline>} [options.deadline]
 * @param {boolean} [options.enabled]
 * @param {number} [options.navigationTimeoutMs]
 */
export async function scanWithBrowser(targetUrl, options = {}) {
  const { deadline = null, enabled = config.browserScanEnabled, navigationTimeoutMs = config.navigationTimeoutMs } = options

  const result = {
    status: 'skipped',
    engine: 'chromium',
    browserVersion: null,
    title: '',
    finalUrl: null,
    mainStatus: null,
    mainDocumentOk: null,
    navigationTiming: null,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    blockedRequests: [],
    resources: {
      images: { seen: 0, failed: 0 },
      stylesheets: { seen: 0, failed: 0 },
    },
    error: null,
    policy: {
      requestInterception: true,
      egressProxy: true,
      webSockets: 'blocked',
      serviceWorkers: 'blocked',
      downloads: 'blocked',
      popups: 'blocked',
    },
  }

  if (!enabled) {
    result.error = { code: 'BROWSER_DISABLED', message: 'Browser checks are disabled by configuration.' }
    return result
  }

  const remaining = deadline ? deadline.remaining() : config.scanTimeoutMs
  if (remaining < 5000) {
    result.error = { code: 'SCAN_TIMEOUT', message: 'Not enough time remained to start the browser.' }
    return result
  }

  // Revalidate immediately before any browser work.
  await validateTargetUrl(targetUrl)

  let proxy = null
  let browser = null
  let context = null
  let page = null

  try {
    proxy = await startEgressProxy({ onBlocked: (entry) => result.blockedRequests.push({ url: `https://${entry.hostname}/`, code: entry.code }) })

    browser = await chromium.launch({
      headless: true,
      timeout: 20000,
      env: safeBrowserEnv(),
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
      args: [
        `--proxy-server=${proxy.url}`,
        // Force even loopback destinations through the enforcing proxy.
        '--proxy-bypass-list=<-loopback>',
        '--disable-quic',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-dev-shm-usage',
        '--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints',
        '--metrics-recording-only',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-pings',
        '--safebrowsing-disable-auto-update',
      ],
    })

    try {
      result.browserVersion = browser.version()
    } catch {
      result.browserVersion = null
    }

    const remainingAfterLaunch = deadline ? deadline.remaining() : config.scanTimeoutMs
    const navBudget = Math.max(3000, Math.min(navigationTimeoutMs, remainingAfterLaunch - 4000))

    context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SiteScanner/1.0',
      ignoreHTTPSErrors: false,
      acceptDownloads: false,
      serviceWorkers: 'block',
      locale: 'en-US',
      timezoneId: 'UTC',
      permissions: [],
      javaScriptEnabled: true,
    })
    await context.clearPermissions()

    const guard = createRequestGuard()
    const blockedKeys = new Set()

    // Layer 1: validate every browser request through the shared policy.
    const handleRoute = createBrowserRequestHandler({
      guard,
      onBlocked: ({ url, redactedUrl, code }) => {
        blockedKeys.add(url)
        pushLimited(result.blockedRequests, { url: redactedUrl, code }, 25)
      },
    })
    await context.route('**/*', handleRoute)

    // Layer 2: no WebSocket can bypass the proxy or Playwright routing.
    try {
      await context.routeWebSocket('**/*', (webSocket) => {
        pushLimited(result.blockedRequests, { url: redactUrlForLog(webSocket.url()), code: 'WEBSOCKET_BLOCKED' }, 25)
        try {
          webSocket.close()
        } catch {
          /* already closed */
        }
      })
    } catch {
      // Older Playwright builds: WebSocket upgrades are still denied by the
      // egress proxy (HTTP 403), so the boundary remains closed.
    }

    page = await context.newPage()
    context.on('page', (popup) => {
      if (popup !== page) {
        pushLimited(result.blockedRequests, { url: 'about:blank', code: 'POPUP_BLOCKED' }, 25)
        popup.close().catch(() => {})
      }
    })
    page.on('download', (download) => download.cancel().catch(() => {}))

    page.on('console', (message) => {
      if (message.type() !== 'error') return
      const location = message.location()
      const item = {
        message: message.text().slice(0, 500),
        url: location?.url || '',
        scope: resourceScope(location?.url || targetUrl, targetUrl),
        blockedByPolicy: blockedKeys.has(location?.url || ''),
      }
      if (!result.consoleErrors.some((existing) => existing.message === item.message && existing.url === item.url)) {
        pushLimited(result.consoleErrors, item, 50)
      }
    })

    page.on('pageerror', (error) => {
      const item = {
        message: String(error?.message || error).slice(0, 500),
        url: page.url() || targetUrl,
        scope: 'same-origin',
      }
      if (!result.pageErrors.some((existing) => existing.message === item.message)) {
        pushLimited(result.pageErrors, item, 20)
      }
    })

    page.on('request', (request) => {
      if (request.resourceType() === 'image') result.resources.images.seen += 1
      if (request.resourceType() === 'stylesheet') result.resources.stylesheets.seen += 1
    })

    page.on('requestfailed', (request) => {
      const failure = request.failure()
      const url = request.url()
      const blockedByPolicy = blockedKeys.has(url) || /ERR_BLOCKED_BY_CLIENT|ERR_TUNNEL_CONNECTION_FAILED/i.test(failure?.errorText || '')
      const resourceType = request.resourceType()
      if (resourceType === 'image' && resourceType !== 'document') result.resources.images.failed += 1
      if (resourceType === 'stylesheet') result.resources.stylesheets.failed += 1

      const item = {
        url: redactUrlForLog(url),
        resourceType,
        errorText: blockedByPolicy ? 'blocked by scanner security policy' : sanitizeFailureText(failure?.errorText),
        scope: resourceScope(url, targetUrl),
        blockedByPolicy,
      }
      if (!result.failedRequests.some((existing) => existing.url === item.url && existing.errorText === item.errorText)) {
        pushLimited(result.failedRequests, item, 60)
      }
    })

    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: navBudget,
    })

    result.mainStatus = response ? response.status() : null
    result.mainDocumentOk = response ? response.ok() : null

    // Give late-loading scripts a short, bounded window to surface errors.
    const settleBudget = Math.min(1800, Math.max(0, (deadline ? deadline.remaining() : 5000) - 1000))
    if (settleBudget > 0) {
      await page.waitForTimeout(settleBudget).catch(() => {})
    }

    try {
      await page.waitForLoadState('load', { timeout: Math.min(2000, Math.max(500, deadline ? deadline.remaining() : 2000)) })
    } catch {
      /* load event may never fire on some pages; observations still valid */
    }

    result.finalUrl = page.url()
    result.title = (await page.title().catch(() => '')) || ''

    try {
      result.navigationTiming = await page.evaluate(() => {
        const entries = performance.getEntriesByType('navigation')
        const nav = entries[0]
        if (!nav) return null
        return {
          domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
          loadMs: Math.round(nav.loadEventEnd || 0),
          ttfbMs: Math.round(nav.responseStart || 0),
          transferSize: nav.transferSize || 0,
        }
      })
    } catch {
      result.navigationTiming = null
    }

    result.status = 'completed'
    return result
  } catch (error) {
    const message = String(error?.message || '')
    let code = 'BROWSER_NAVIGATION_FAILED'
    if (/Executable doesn't exist|browserType\.launch|ENOENT/i.test(message)) code = 'BROWSER_UNAVAILABLE'
    else if (/Timeout|timeout/i.test(message)) code = 'BROWSER_TIMEOUT'
    else if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY_CONNECTION_FAILED/i.test(message)) code = 'EGRESS_PROXY_BLOCKED'
    else if (/ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED/i.test(message)) code = 'BROWSER_DNS_FAILED'

    result.status = 'failed'
    result.error = {
      code,
      // Deliberately generic: no filesystem paths, internal addresses or stack traces.
      message:
        code === 'BROWSER_TIMEOUT'
          ? 'The browser did not finish loading the page within the scan limit.'
          : code === 'BROWSER_UNAVAILABLE'
            ? 'The Chromium browser is not available on the server.'
            : code === 'BROWSER_DNS_FAILED'
              ? 'The browser could not resolve the website hostname.'
              : code === 'EGRESS_PROXY_BLOCKED'
                ? 'The browser request was blocked by the outbound security policy.'
                : 'The browser could not load the page.',
    }
    return result
  } finally {
    try {
      if (page) await page.close().catch(() => {})
    } catch {
      /* noop */
    }
    try {
      if (context) await context.close().catch(() => {})
    } catch {
      /* noop */
    }
    try {
      if (browser) await browser.close().catch(() => {})
    } catch {
      /* noop */
    }
    try {
      if (proxy) await proxy.close()
    } catch {
      /* noop */
    }
  }
}
