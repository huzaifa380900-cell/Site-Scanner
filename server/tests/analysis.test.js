import { describe, expect, it } from 'vitest'
import { analyzeHtml } from '../src/scanners/htmlAnalyzer.js'
import { detectTechnologies } from '../src/scanners/techDetector.js'
import { analyzeSecurity } from '../src/scanners/securityAnalyzer.js'
import {
  buildFindings,
  calculateObservationScore,
  dedupeFindings,
  summarizeFindings,
} from '../src/scanners/findingsBuilder.js'

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Acme Widgets — Home</title>
  <meta name="description" content="Widgets for testing.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="WordPress 6.2">
  <link rel="canonical" href="https://example.com/">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
  <script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"></script>
  <script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>
  <script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>
  <script src="http://insecure.example.com/legacy.js"></script>
</head>
<body>
  <h1>Welcome</h1>
  <h2>Features</h2>
  <img src="/a.png" alt="A widget">
  <img src="/b.png">
  <a href="/about">About</a>
  <a href="https://external.example.org/">External</a>
  <script src="/app.js"></script>
  <style>.x { color: red; }</style>
</body>
</html>`

const HEADERS = {
  server: 'cloudflare',
  'x-powered-by': 'Express',
  'content-type': 'text/html; charset=utf-8',
}

describe('HTML analyzer', () => {
  const page = analyzeHtml(HTML, 'https://example.com/path')

  it('extracts metadata', () => {
    expect(page.title).toBe('Acme Widgets — Home')
    expect(page.metaDescription).toBe('Widgets for testing.')
    expect(page.canonical).toBe('https://example.com/')
    expect(page.canonicalMatchesPage).toBe(true)
    expect(page.lang).toBe('en')
    expect(page.viewport).toContain('width=device-width')
    expect(page.generator).toBe('WordPress 6.2')
    expect(page.charset).toBe('utf-8')
  })

  it('extracts heading structure', () => {
    expect(page.headingStructure.counts.h1).toBe(1)
    expect(page.headingStructure.counts.h2).toBe(1)
    expect(page.headingStructure.total).toBe(2)
    expect(page.headingStructure.outline[0]).toEqual({ level: 'h1', text: 'Welcome' })
  })

  it('counts images with missing alt text', () => {
    expect(page.images.total).toBe(2)
    expect(page.images.missingAlt).toBe(1)
    expect(page.images.missingAltExamples[0]).toContain('/b.png')
  })

  it('separates internal and external links', () => {
    expect(page.links.total).toBe(2)
    expect(page.links.internalCount).toBe(1)
    expect(page.links.externalCount).toBe(1)
    expect(page.links.internal[0]).toBe('https://example.com/about')
  })

  it('collects scripts and styles', () => {
    expect(page.scripts.externalCount).toBe(5)
    expect(page.scripts.inlineCount).toBe(0)
    expect(page.styles.externalCount).toBe(1)
    expect(page.styles.inlineCount).toBe(1)
  })

  it('detects mixed content on HTTPS pages', () => {
    expect(page.mixedContent.count).toBe(1)
    expect(page.mixedContent.candidates[0]).toContain('insecure.example.com')
  })

  it('returns null for empty HTML', () => {
    expect(analyzeHtml('', 'https://example.com')).toBeNull()
  })
})

describe('technology detection', () => {
  const page = analyzeHtml(HTML, 'https://example.com/')
  const technologies = detectTechnologies({
    html: HTML,
    headers: HEADERS,
    scriptUrls: page.scripts.sources,
    styleUrls: page.styles.sources,
    linkUrls: page.assets.allUrls,
    generator: page.generator,
  })
  const names = technologies.map((item) => item.name)

  it('detects evidenced frontend technologies', () => {
    expect(names).toContain('React')
    expect(names).toContain('jQuery')
    expect(names).toContain('Bootstrap')
    expect(names).toContain('Google Analytics')
    expect(names).toContain('jsDelivr')
    expect(names).toContain('Cloudflare')
    expect(names).toContain('Express')
  })

  it('detects CMS from generator evidence', () => {
    expect(names).toContain('WordPress')
    const wordpress = technologies.find((item) => item.name === 'WordPress')
    expect(wordpress.evidence.join(' ')).toContain('WordPress')
    expect(wordpress.confidence).toBe('high')
  })

  it('does not invent unsupported technologies', () => {
    expect(names).not.toContain('Next.js')
    expect(names).not.toContain('Drupal')
    expect(names).not.toContain('Shopify')
    expect(names).not.toContain('Preact')
  })

  it('assigns a category and confidence to every detection', () => {
    for (const item of technologies) {
      expect(item.category).toBeTruthy()
      expect(['high', 'medium', 'low']).toContain(item.confidence)
      expect(item.evidence.length).toBeGreaterThan(0)
    }
  })
})

describe('security analyzer', () => {
  const page = analyzeHtml(HTML, 'https://example.com/')

  it('reports missing headers as low-severity recommendations, never critical', () => {
    const { findings, summary } = analyzeSecurity({
      headers: HEADERS,
      finalUrl: 'https://example.com/',
      page,
      httpStatus: 200,
    })
    expect(summary.https).toBe(true)
    expect(summary.csp.present).toBe(false)
    expect(summary.missingHeaders).toContain('content-security-policy')
    expect(findings.some((item) => item.severity === 'critical')).toBe(false)
    const headerFindings = findings.filter((item) => item.category === 'security-headers')
    expect(headerFindings.length).toBeGreaterThan(0)
    expect(headerFindings.every((item) => ['low', 'info'].includes(item.severity))).toBe(true)
    expect(headerFindings.every((item) => ['recommendation', 'observation'].includes(item.kind))).toBe(true)
    expect(findings.every((item) => item.kind !== 'inconclusive')).toBe(true)
  })

  it('flags plain HTTP as a high-severity potential issue', () => {
    const { findings } = analyzeSecurity({
      headers: { server: 'nginx/1.18.0' },
      finalUrl: 'http://example.com/',
      page: null,
      httpStatus: 200,
    })
    const httpFinding = findings.find((item) => item.title.includes('without HTTPS'))
    expect(httpFinding.severity).toBe('high')
    expect(httpFinding.kind).toBe('potential-issue')
  })

  it('flags mixed content based on real HTML references', () => {
    const { findings } = analyzeSecurity({
      headers: {},
      finalUrl: 'https://example.com/',
      page,
      httpStatus: 200,
    })
    const mixed = findings.find((item) => item.title.includes('insecure HTTP resources'))
    expect(mixed.severity).toBe('medium')
    expect(mixed.evidence).toContain('insecure.example.com')
  })

  it('observes short HSTS max-age', () => {
    const { findings } = analyzeSecurity({
      headers: { 'strict-transport-security': 'max-age=300' },
      finalUrl: 'https://example.com/',
      page: null,
      httpStatus: 200,
    })
    expect(findings.some((item) => item.title.includes('HSTS max-age'))).toBe(true)
  })
})

describe('findings builder', () => {
  it('deduplicates equivalent findings and merges evidence', () => {
    const items = dedupeFindings([
      { title: 'Same', severity: 'low', kind: 'observation', category: 'x', evidence: 'a' },
      { title: 'Same', severity: 'low', kind: 'observation', category: 'x', evidence: 'b' },
    ])
    expect(items).toHaveLength(1)
    expect(items[0].evidence).toContain('a')
    expect(items[0].evidence).toContain('b')
    expect(items[0].id).toMatch(/^[0-9a-f]{12}$/)
  })

  it('calculates the documented heuristic score', () => {
    expect(calculateObservationScore([])).toBe(100)
    expect(
      calculateObservationScore([
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' },
        { severity: 'info' },
      ]),
    ).toBe(74)
    expect(calculateObservationScore([{ severity: 'critical' }, { severity: 'critical' }, { severity: 'critical' }, { severity: 'critical' }])).toBe(0)
    expect(calculateObservationScore([{ severity: 'high' }], { evaluated: false })).toBeNull()
    expect(calculateObservationScore(null)).toBeNull()
  })

  it('summarizes findings by severity and category', () => {
    const summary = summarizeFindings([
      { severity: 'high', category: 'browser' },
      { severity: 'low', category: 'browser' },
      { severity: 'info', category: 'metadata' },
    ])
    expect(summary.total).toBe(3)
    expect(summary.bySeverity.high).toBe(1)
    expect(summary.byCategory.browser).toBe(2)
  })

  it('derives HTTP, metadata and browser findings from observations', () => {
    const findings = buildFindings({
      http: { statusCode: 500, statusMessage: 'Internal Server Error', finalUrl: 'https://example.com/', redirects: [] },
      page: {
        title: '',
        titleLength: 0,
        metaDescription: '',
        viewport: '',
        lang: '',
        images: { total: 0, missingAlt: 0, missingAltExamples: [] },
        headingStructure: { counts: { h1: 0 }, total: 0 },
        canonical: null,
        scripts: { sources: [] },
        forms: { insecureActionCount: 0 },
        mixedContent: { count: 0, candidates: [] },
      },
      browser: {
        status: 'completed',
        finalUrl: 'https://example.com/',
        mainStatus: 200,
        pageErrors: [{ message: 'TypeError: boom', url: 'https://example.com/app.js' }],
        consoleErrors: [],
        failedRequests: [],
      },
      securityFindings: [],
      linkChecks: { checked: 1, broken: [{ url: 'https://example.com/missing', statusCode: 404 }], skipped: 0 },
    })

    expect(findings.some((item) => item.title === 'Page returned HTTP 500')).toBe(true)
    expect(findings.some((item) => item.title === 'Page title is missing')).toBe(true)
    expect(findings.some((item) => item.title === 'Responsive viewport meta tag is missing')).toBe(true)
    expect(findings.some((item) => item.title === 'Uncaught JavaScript errors occurred')).toBe(true)
    expect(findings.some((item) => item.title === 'Some internal links could not be loaded')).toBe(true)
    expect(findings[0].severity).toBe('high')
  })

  it('does not claim the site is bug-free', () => {
    const findings = buildFindings({
      http: { statusCode: 200, finalUrl: 'https://example.com/', redirects: [] },
      page: null,
      browser: {
        status: 'completed',
        finalUrl: 'https://example.com/',
        mainStatus: 200,
        pageErrors: [],
        consoleErrors: [],
        failedRequests: [],
      },
    })
    const noErrors = findings.find((item) => item.title.includes('No browser console or page errors'))
    expect(noErrors).toBeTruthy()
    expect(noErrors.description).toMatch(/does not prove the site is bug-free/i)
  })
})
