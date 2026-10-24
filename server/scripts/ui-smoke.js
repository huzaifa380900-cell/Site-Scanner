/**
 * Optional end-to-end UI verification.
 *
 * Prerequisites:
 *   1. API running with a connected MongoDB (Atlas or a local MongoDB you own)
 *   2. Vite dev server running on http://127.0.0.1:5173
 *
 * Run from the server directory:
 *   node scripts/ui-smoke.js
 *
 * It uses the real backend, real network scans and the real database. It also
 * writes screenshots to docs/screenshots/ and verifies JSON export contents.
 */
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const UI_BASE = process.env.UI_BASE_URL || 'http://localhost:5173'
const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api'
const screenshotDir = path.resolve(process.cwd(), '..', 'docs', 'screenshots')

const checks = []
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail })
  if (!condition) throw new Error(`Check failed: ${name}${detail ? ` — ${detail}` : ''}`)
}

async function getJson(url) {
  const response = await fetch(url)
  return { status: response.status, body: await response.json() }
}

await fs.mkdir(screenshotDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
  deviceScaleFactor: 1,
})
const page = await context.newPage()
page.setDefaultTimeout(20000)

const pageErrors = []
const consoleErrors = []
page.on('pageerror', (error) => pageErrors.push(String(error.message)))
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

try {
  await page.goto(UI_BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Start with a public website')
  await page.waitForSelector('text=API & database online', { timeout: 15000 })
  check('health indicator reports API and database online', true)
  check('empty state renders', true)
  await page.screenshot({ path: path.join(screenshotDir, 'empty-state.png'), fullPage: true })

  const urlInput = page.getByLabel('Website URL')

  // ---------------------------------------------------- blocked target error
  await urlInput.fill('http://127.0.0.1')
  await page.getByRole('button', { name: 'Scan Website' }).click()
  await page.waitForSelector('text=This URL is not allowed for security reasons.', { timeout: 20000 })
  check('blocked target shows a safe error', true)
  check('blocked target error code is visible', (await page.locator('text=PROHIBITED_ADDRESS').count()) > 0)
  check('blocked target did not produce a report', (await page.getByText('Scan report', { exact: true }).count()) === 0)
  await page.screenshot({ path: path.join(screenshotDir, 'blocked-target.png'), fullPage: true })

  // ------------------------------------------------------ successful scan UI
  await urlInput.fill('https://example.com')
  await page.getByRole('button', { name: 'Scan Website' }).click()
  await page.getByText('Scan report', { exact: true }).waitFor({ timeout: 120000 })
  await page.waitForSelector('text=Observation score', { timeout: 20000 })
  check('successful scan renders the overview', true)
  check('hostname is shown', (await page.locator('h2', { hasText: 'example.com' }).count()) > 0)

  const scoreText = await page.locator('p.text-3xl').first().innerText()
  const score = Number(scoreText)
  check('observation score is a heuristic number', Number.isFinite(score) && score >= 0 && score <= 100, scoreText)
  check('findings are present', (await page.locator('article').count()) > 0)
  await page.screenshot({ path: path.join(screenshotDir, 'report-overview.png') })

  // ------------------------------------------------------- select from history
  const historyItem = page.locator('aside button').filter({ hasText: 'example.com' }).first()
  await historyItem.waitFor({ state: 'visible' })
  check('history contains the saved scan', (await historyItem.count()) > 0)
  const historyResponse = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname
    return response.request().method() === 'GET' && /^\/api\/scans\/[a-f0-9]{24}$/.test(pathname)
  })
  await historyItem.click()
  await historyResponse
  await page.waitForTimeout(300)
  await page.getByText('Scan report', { exact: true }).waitFor({ timeout: 20000 })
  check('previous report opens from history', true)

  // ---------------------------------------------------------------- tabs
  await page.getByRole('tab', { name: /Technologies/ }).click()
  await page.waitForSelector('text=Cloudflare', { timeout: 10000 })
  check('technology tab shows evidenced detections', true)
  await page.screenshot({ path: path.join(screenshotDir, 'technologies.png') })

  await page.getByRole('tab', { name: /Browser/ }).click()
  await page.waitForSelector('text=Console errors', { timeout: 10000 })
  check('browser tab renders observations', true)

  await page.getByRole('tab', { name: /Metadata & HTTP/ }).click()
  await page.waitForSelector('text=Security-header observations', { timeout: 10000 })
  check('metadata tab renders HTTP and security data', true)
  await page.screenshot({ path: path.join(screenshotDir, 'metadata-http.png') })

  await page.getByRole('tab', { name: /Findings/ }).click()

  // -------------------------------------------------------------- export JSON
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const download = await downloadPromise
  const exportPath = path.join(os.tmpdir(), `site-scanner-export-${Date.now()}.json`)
  await download.saveAs(exportPath)
  const exported = JSON.parse(await fs.readFile(exportPath, 'utf8'))
  check('export contains scan metadata', exported.report?.targetUrl === 'https://example.com/')
  check('export contains findings', Array.isArray(exported.report?.findings) && exported.report.findings.length > 0)
  check('export contains technologies', Array.isArray(exported.report?.technologies))
  check('export contains browser observations', Array.isArray(exported.report?.browserErrors))
  check('export contains page metadata', Boolean(exported.report?.pageMetadata?.title))
  check(
    'export does not contain secrets',
    !/MONGODB_URI|mongodb\+srv|password|set-cookie/i.test(JSON.stringify(exported)),
  )
  await fs.unlink(exportPath).catch(() => {})

  // ------------------------------------------------ client-side URL validation
  await urlInput.fill('example.com')
  await page.getByRole('button', { name: 'Scan Website' }).click()
  await page.waitForSelector('text=Enter a valid absolute URL', { timeout: 10000 })
  check('client-side URL validation message appears', true)

  // ------------------------------------------------------ database persistence
  const health = await getJson(`${API_BASE}/health`)
  check('health reports database connected', health.body?.data?.database?.connected === true)

  const list = await getJson(`${API_BASE}/scans?limit=5`)
  check('scan history is persisted in MongoDB', list.body?.data?.items?.length >= 1)
  const saved = list.body.data.items[0]
  check('persisted report has the expected hostname', saved.hostname === 'example.com')

  const single = await getJson(`${API_BASE}/scans/${saved.id}`)
  check('saved report can be retrieved by id', single.status === 200 && single.body?.data?.id === saved.id)
  check('saved report retains findings', single.body.data.findings.length > 0)
  check(
    'stored report contains no database credentials',
    !/MONGODB_URI|mongodb\+srv/i.test(JSON.stringify(single.body)),
  )

  // ---------------------------------------------------------- responsive check
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(UI_BASE, { waitUntil: 'domcontentloaded' })
  await mobilePage.waitForSelector('text=Recent scans')
  const mobileHistoryItem = mobilePage.locator('aside button').filter({ hasText: 'example.com' }).first()
  await mobileHistoryItem.waitFor({ state: 'visible' })
  const mobileHistoryResponse = mobilePage.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname
    return response.request().method() === 'GET' && /^\/api\/scans\/[a-f0-9]{24}$/.test(pathname)
  })
  await mobileHistoryItem.click()
  await mobileHistoryResponse
  await mobilePage.waitForTimeout(300)
  await mobilePage.getByText('Scan report', { exact: true }).waitFor({ timeout: 20000 })
  await mobilePage.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await mobilePage.waitForTimeout(300)
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('mobile layout has no horizontal overflow', overflow <= 1, `overflow=${overflow}px`)
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'mobile-report.png'), fullPage: false })
  await mobileContext.close()

  console.log(JSON.stringify({ ok: true, checks, pageErrors, consoleErrors }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, checks, pageErrors, consoleErrors }, null, 2))
  process.exitCode = 1
} finally {
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
}
