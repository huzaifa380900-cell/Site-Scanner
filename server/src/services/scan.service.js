import { performance } from 'node:perf_hooks'
import { config } from '../config/env.js'
import { isDatabaseConnected } from '../config/database.js'
import { validateTargetUrl } from '../security/ssrfProtection.js'
import { scanHttp, checkInternalLinks } from '../scanners/httpScanner.js'
import { analyzeHtml } from '../scanners/htmlAnalyzer.js'
import { detectTechnologies } from '../scanners/techDetector.js'
import { analyzeSecurity } from '../scanners/securityAnalyzer.js'
import { scanWithBrowser } from '../scanners/browserScanner.js'
import { buildFindings, calculateObservationScore, summarizeFindings } from '../scanners/findingsBuilder.js'
import { createDeadline, createSemaphore, withTimeout } from '../utils/scanLimits.js'
import { AppError } from '../utils/errors.js'
import { ScanReport } from '../models/ScanReport.js'

/**
 * Scan orchestration. One scan runs in-process; expensive browser work is
 * bounded by a per-scan deadline and a global concurrency semaphore.
 */

const semaphore = createSemaphore(config.maxScanConcurrency)
const inFlight = new Map()
const MAX_HISTORY_PER_OWNER = 12
const MAX_STORED_REPORTS = 100

function assertDatabaseReady() {
  if (!isDatabaseConnected()) {
    throw new AppError(
      'DATABASE_UNAVAILABLE',
      'The MongoDB database is not connected. Scan history and report persistence are unavailable until the server reconnects. Check the configuration and /api/health.',
      { statusCode: 503 },
    )
  }
}

function cleanStaleLocks() {
  const cutoff = Date.now() - config.scanTimeoutMs * 3
  for (const [key, startedAt] of inFlight.entries()) {
    if (startedAt < cutoff) inFlight.delete(key)
  }
}

export async function runPipeline(validated) {
  const startedAt = new Date()
  const startedHr = performance.now()
  const deadline = createDeadline(config.scanTimeoutMs)

  // Stage 2 + 3: HTTP and HTML.
  const { http, html } = await scanHttp(validated.url, { deadline })
  const page = analyzeHtml(html, http.finalUrl)

  // Stage 4: passive technology fingerprinting.
  const technologies = detectTechnologies({
    html,
    headers: http.headers,
    scriptUrls: page?.scripts?.sources || [],
    styleUrls: page?.styles?.sources || [],
    linkUrls: page?.assets?.allUrls || [],
    generator: page?.generator || '',
  })

  // Stage 5: security-header observations.
  const security = analyzeSecurity({
    headers: http.headers,
    finalUrl: http.finalUrl,
    page,
    httpStatus: http.statusCode,
  })

  // Stage 6: browser checks (non-fatal: failures are reported as inconclusive).
  let browser = null
  if (config.browserScanEnabled && deadline.remaining() > 5000) {
    browser = await scanWithBrowser(http.finalUrl, { deadline })
  } else {
    browser = {
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
      resources: { images: { seen: 0, failed: 0 }, stylesheets: { seen: 0, failed: 0 } },
      error: {
        code: config.browserScanEnabled ? 'SCAN_TIMEOUT' : 'BROWSER_DISABLED',
        message: config.browserScanEnabled
          ? 'The scan did not have enough time remaining for browser checks.'
          : 'Browser checks are disabled by configuration.',
      },
      policy: null,
    }
  }

  // Bounded internal link checks — only while the deadline permits.
  let linkChecks = { checked: 0, broken: [], skipped: 0, candidates: 0 }
  if (config.checkLinks && deadline.remaining() > 6000) {
    linkChecks = await checkInternalLinks(page, { deadline })
  }

  // Stage 7: findings and heuristic score.
  const findings = buildFindings({
    http,
    page,
    browser,
    securityFindings: security.findings,
    linkChecks,
  })

  const observationScore = calculateObservationScore(findings, { evaluated: Boolean(page) })
  const severityCounts = summarizeFindings(findings).bySeverity

  const completedAt = new Date()
  const durationMs = Math.round(performance.now() - startedHr)

  const browserErrors = [
    ...(browser.consoleErrors || []).map((item) => ({
      type: 'console',
      message: item.message,
      url: item.url,
      scope: item.scope,
    })),
    ...(browser.pageErrors || []).map((item) => ({
      type: 'pageerror',
      message: item.message,
      url: item.url,
      scope: item.scope,
    })),
  ].slice(0, 80)

  return {
    targetUrl: validated.url,
    hostname: validated.hostname,
    status: 'completed',
    httpStatus: http.statusCode,
    durationMs,
    observationScore,
    scoreMethod: 'heuristic-v1',
    findingCount: findings.length,
    severityCounts,
    findings,
    technologies,
    browserErrors,
    failedResources: (browser.failedRequests || []).slice(0, 80),
    pageMetadata: {
      ...page,
      // HTTP timing and size are attached here for a single, consistent
      // metadata payload in the UI and JSON export.
      responseTimeMs: http.responseTimeMs,
      ttfbMs: http.ttfbMs,
      bodyBytes: http.bodyBytes,
      linkChecks,
      browserTitle: browser.title || null,
      browserFinalUrl: browser.finalUrl || null,
    },
    httpHeaders: http.headers,
    redirects: http.redirects,
    security: security.summary,
    browser: {
      status: browser.status,
      engine: browser.engine,
      browserVersion: browser.browserVersion,
      title: browser.title,
      finalUrl: browser.finalUrl,
      mainStatus: browser.mainStatus,
      mainDocumentOk: browser.mainDocumentOk,
      navigationTiming: browser.navigationTiming,
      resources: browser.resources,
      blockedRequests: browser.blockedRequests,
      policy: browser.policy,
      error: browser.error,
    },
    errorSummary: null,
    startedAt,
    completedAt,
  }
}

/**
 * Validate, gate and execute a scan, then persist it.
 * @param {string} rawUrl
 * @param {{clientKey?: string}} [options]
 */
export async function createScan(rawUrl, { clientKey = 'anonymous', ownerHash } = {}) {
  // Security validation always happens before any outbound request and
  // before database access.
  const validated = await validateTargetUrl(rawUrl)
  assertDatabaseReady()

  cleanStaleLocks()
  const lockKey = `${clientKey}:${validated.hostname}`
  if (inFlight.has(lockKey)) {
    throw new AppError('DUPLICATE_SCAN', 'A scan for this website is already running. Wait for it to finish before retrying.', {
      statusCode: 429,
    })
  }
  if (!semaphore.tryAcquire()) {
    throw new AppError('SCAN_CAPACITY_EXCEEDED', 'The scanner is at capacity. Try again in a few moments.', {
      statusCode: 429,
      details: { retryAfterSeconds: 15 },
    })
  }

  inFlight.set(lockKey, Date.now())
  try {
    const report = await withTimeout(runPipeline(validated), config.scanTimeoutMs + 8000, {
      code: 'SCAN_TIMEOUT',
      message: 'The scan took too long and was stopped.',
    })

    let saved
    try {
      saved = await ScanReport.create({ ...report, ownerHash })
    } catch (error) {
      console.error(`[scan] Failed to persist report: ${error.message}`)
      throw new AppError(
        'DATABASE_WRITE_FAILED',
        'The scan completed but the report could not be saved to MongoDB. Please retry.',
        { statusCode: 503, cause: error },
      )
    }

    try {
      await pruneScanHistory(ownerHash)
    } catch (error) {
      console.error(`[scan] Failed to enforce scan-history retention: ${error.message}`)
    }

    return saved.toJSON()
  } finally {
    inFlight.delete(lockKey)
    semaphore.release()
  }
}

export async function listScans({ page = 1, limit = 10, ownerHash } = {}) {
  assertDatabaseReady()
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10))
  const skip = (safePage - 1) * safeLimit

  const filter = { ownerHash }
  const [items, total] = await Promise.all([
    ScanReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select(
        'targetUrl hostname status httpStatus durationMs observationScore findingCount severityCounts createdAt completedAt',
      )
      .lean(),
    ScanReport.countDocuments(filter),
  ])

  return {
    items: items.map((item) => ({
      id: String(item._id),
      targetUrl: item.targetUrl,
      hostname: item.hostname,
      status: item.status,
      httpStatus: item.httpStatus,
      durationMs: item.durationMs,
      observationScore: item.observationScore,
      findingCount: item.findingCount,
      severityCounts: item.severityCounts,
      createdAt: item.createdAt,
      completedAt: item.completedAt,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 0,
    },
  }
}

export async function getScanById(id, ownerHash) {
  assertDatabaseReady()
  if (!/^[0-9a-fA-F]{24}$/.test(String(id || ''))) {
    throw new AppError('INVALID_ID', 'The scan report ID is invalid.', { statusCode: 400 })
  }
  const report = await ScanReport.findOne({ _id: id, ownerHash })
  if (!report) {
    throw new AppError('NOT_FOUND', 'Scan report not found.', { statusCode: 404 })
  }
  return report.toJSON()
}

export async function deleteScanById(id, ownerHash) {
  assertDatabaseReady()
  if (!/^[0-9a-fA-F]{24}$/.test(String(id || ''))) {
    throw new AppError('INVALID_ID', 'The scan report ID is invalid.', { statusCode: 400 })
  }
  const result = await ScanReport.deleteOne({ _id: id, ownerHash })
  if (result.deletedCount === 0) {
    throw new AppError('NOT_FOUND', 'Scan report not found.', { statusCode: 404 })
  }
}

async function pruneScanHistory(ownerHash) {
  await deleteReportsBeyond({ ownerHash }, MAX_HISTORY_PER_OWNER)
  await deleteReportsBeyond({}, MAX_STORED_REPORTS)
}

async function deleteReportsBeyond(filter, limit) {
  const excess = await ScanReport.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(limit)
    .select('_id')
    .lean()
  if (excess.length) {
    await ScanReport.deleteMany({ _id: { $in: excess.map((report) => report._id) } })
  }
}

export function getScannerCapacity() {
  return {
    active: semaphore.active,
    limit: semaphore.limit,
    available: semaphore.available,
    inFlight: inFlight.size,
  }
}
