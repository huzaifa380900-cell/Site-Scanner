import { chromium as playwright } from 'playwright-core'
import fs from 'node:fs'
import { config } from '../config/env.js'
import { createBrowserRequestHandler } from '../security/browserRequestHandler.js'
import { startEgressProxy } from '../security/egressProxy.js'
import { createRequestGuard, redactUrlForLog, validateTargetUrl } from '../security/ssrfProtection.js'
import { pushLimited } from '../utils/scanLimits.js'
import { describeRuntime, isServerlessRuntime, resolveServerlessChromium } from './chromiumRuntime.js'

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
 *
 * Compatible with Vercel Serverless (using @sparticuz/chromium + playwright-core)
 * and local development (auto-detects local Chrome/Edge or PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH).
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
  const allow = [
    'PATH',
    'SystemRoot',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'TMPDIR',
    'USERPROFILE',
    'LOCALAPPDATA',
    'APPDATA',
    'HOME',
    'LANG',
    'LC_ALL',
    'LD_LIBRARY_PATH',
    'FONTCONFIG_PATH',
    'AWS_EXECUTION_ENV',
    'AWS_LAMBDA_JS_RUNTIME',
    'VERCEL',
    'VERCEL_ENV',
  ]
  const env = {}
  for (const key of allow) {
    if (process.env[key]) env[key] = process.env[key]
  }
  return env
}

/**
 * Flags that must never reach the browser process.
 *
 * - `--disable-web-security` and `--allow-running-insecure-content` weaken the
 *   browser's own web security model. The scanner must observe the site the
 *   same way a normal browser would.
 * - Headless flags are controlled by Playwright itself; the Sparticuz default
 *   (`--headless='shell'`) conflicts with it.
 * - Graphics flags are dropped because the scanner runs with the GPU disabled.
 */
const BLOCKED_CHROMIUM_ARGS = new Set([
  '--disable-web-security',
  '--allow-running-insecure-content',
  '--headless',
  "--headless='shell'",
  '--headless=shell',
  '--headless=new',
  '--headless=old',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--ignore-gpu-blocklist',
  '--in-process-gpu',
])

export function filterChromiumArgs(args) {
  return args.filter((arg) => !BLOCKED_CHROMIUM_ARGS.has(arg))
}

/**
 * Remove absolute filesystem paths and connection strings from log output.
 * Keeps the useful part (library names, error codes) but never leaks the
 * deployment layout, home directories or credentials.
 */
function sanitizeLogText(text) {
  return String(text || '')
    .replace(/(mongodb(?:\+srv)?:\/\/)[^\s"']+/gi, '$1[redacted]')
    .replace(/(\/[A-Za-z0-9._@+-]+){2,}\/?/g, '[path]/')
    .replace(/[A-Za-z]:\\[^\s")]+/g, '[path]')
    .replace(/\s+/g, ' ')
    .slice(0, 700)
}

function logBrowserEvent(level, message, payload) {
  const line = `[browser] ${message}`
  if (level === 'error') {
    console.error(line, JSON.stringify(payload))
    return
  }
  console.log(line, JSON.stringify(payload))
}

/**
 * Resolve the appropriate Chromium executable path and launch arguments.
 * Supports Vercel/Linux Serverless environments (@sparticuz/chromium) and
 * local development environments (Windows, macOS, Linux).
 */
async function resolveChromiumConfig(proxyUrl) {
  const isVercelOrLambda = Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_VERSION ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.AWS_LAMBDA_JS_RUNTIME ||
      process.env.LAMBDA_TASK_ROOT ||
      (process.platform === 'linux' && !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)
  )

  let executablePath = null
  let extraArgs = []
  let diagnostics = { source: 'unknown' }

  // 1. Explicit override if provided
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    diagnostics = { source: 'explicit-override' }
  } else if (isVercelOrLambda) {
    // Serverless: use @sparticuz/chromium. The runtime bootstrap inflates the
    // Chromium binary and the shared libraries that Amazon Linux 2023 does
    // not provide (Vercel does not look like AWS Lambda to the package).
    const resolved = await resolveServerlessChromium()
    executablePath = resolved.executablePath
    extraArgs = resolved.args
    diagnostics = { source: 'sparticuz', ...resolved.diagnostics }
  } else {
    // Local development fallback: detect installed Chrome or Edge
    const localCandidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ]

    for (const candidate of localCandidates) {
      if (fs.existsSync(candidate)) {
        executablePath = candidate
        break
      }
    }
    diagnostics = { source: 'local-browser' }

    if (!executablePath) {
      throw new Error('No compatible Chromium binary could be found.')
    }
  }

  const baseArgs = [
    `--proxy-server=${proxyUrl}`,
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
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--single-process',
  ]

  // Deduplicate arguments and drop the flags that must never be used.
  const combinedArgs = Array.from(new Set([...baseArgs, ...filterChromiumArgs(extraArgs)]))

  return { executablePath, args: combinedArgs, diagnostics }
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

    const { executablePath, args, diagnostics } = await resolveChromiumConfig(proxy.url)

    if (!executablePath) {
      throw new Error("Executable doesn't exist: No compatible Chromium binary could be found.")
    }

    logBrowserEvent('info', 'Launching Chromium', {
      runtime: describeRuntime(),
      serverless: isServerlessRuntime(),
      ...diagnostics,
      argumentCount: args.length,
    })

    try {
      browser = await playwright.launch({
        headless: true,
        timeout: 20000,
        env: safeBrowserEnv(),
        executablePath,
        args,
      })
    } catch (launchError) {
      // Log the real launch failure (sanitized) so the Vercel runtime log
      // shows whether the binary was missing, a shared library was not found
      // or the process exited early.
      logBrowserEvent('error', 'Chromium launch failed', {
        runtime: describeRuntime(),
        ...diagnostics,
        reason: sanitizeLogText(launchError?.message || launchError),
      })
      throw launchError
    }

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
        url: location?.url ? redactUrlForLog(location.url) : '',
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
        url: redactUrlForLog(page.url() || targetUrl),
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
    const launchFailure = /browserType\.launch|Failed to launch the browser process|Executable doesn't exist|Protocol error|browser has disconnected/i.test(
      message,
    )

    let code = 'BROWSER_NAVIGATION_FAILED'
    if (/error while loading shared librar|cannot open shared object file|libnss3|libnspr4|libexpat/i.test(message)) {
      code = 'BROWSER_LIBS_MISSING'
    } else if (/Executable doesn't exist|ENOENT|does not exist/i.test(message)) {
      code = 'BROWSER_BINARY_MISSING'
    } else if (launchFailure && /timeout/i.test(message)) {
      code = 'BROWSER_LAUNCH_TIMEOUT'
    } else if (launchFailure) {
      code = 'BROWSER_LAUNCH_FAILED'
    } else if (/No compatible Chromium binary could be found/i.test(message)) {
      code = 'BROWSER_UNAVAILABLE'
    } else if (/timeout/i.test(message)) {
      code = 'BROWSER_TIMEOUT'
    } else if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY_CONNECTION_FAILED/i.test(message)) {
      code = 'EGRESS_PROXY_BLOCKED'
    } else if (/ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED/i.test(message)) {
      code = 'BROWSER_DNS_FAILED'
    }

    if (code !== 'BROWSER_LAUNCH_FAILED' && code !== 'BROWSER_LIBS_MISSING' && code !== 'BROWSER_BINARY_MISSING') {
      logBrowserEvent('info', 'Browser stage failed', { code, reason: sanitizeLogText(message) })
    }

    const messages = {
      BROWSER_TIMEOUT: 'The browser did not finish loading the page within the scan limit.',
      BROWSER_UNAVAILABLE: 'The Chromium browser is not available on the server.',
      BROWSER_BINARY_MISSING: 'The Chromium browser binary is not available on the server.',
      BROWSER_LIBS_MISSING: 'The Chromium runtime libraries are not available on the server.',
      BROWSER_LAUNCH_TIMEOUT: 'The Chromium browser took too long to start on the server.',
      BROWSER_LAUNCH_FAILED: 'The Chromium browser could not be started on the server.',
      BROWSER_DNS_FAILED: 'The browser could not resolve the website hostname.',
      EGRESS_PROXY_BLOCKED: 'The browser request was blocked by the outbound security policy.',
    }

    result.status = 'failed'
    result.error = {
      code,
      // Deliberately generic: no filesystem paths, internal addresses or stack traces.
      message: messages[code] || 'The browser could not load the page.',
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
