/**
 * Operator smoke check: runs the real scan pipeline against a public URL
 * WITHOUT database persistence, so the scanner can be verified before Atlas
 * credentials are configured.
 *
 * Usage:
 *   node scripts/scan-smoke.js https://example.com
 *   $env:BROWSER_SCAN_ENABLED="false"; node scripts/scan-smoke.js https://example.com
 *
 * This does not write mock reports anywhere and is not used by the API.
 */
import { validateTargetUrl } from '../src/security/ssrfProtection.js'
import { runPipeline } from '../src/services/scan.service.js'

const url = process.argv[2] || 'https://example.com'

try {
  const validated = await validateTargetUrl(url)
  console.log(`[smoke] Scanning ${validated.url} (${validated.addresses.map((a) => a.address).join(', ')})`)
  const report = await runPipeline(validated)

  const summary = {
    targetUrl: report.targetUrl,
    status: report.status,
    httpStatus: report.httpStatus,
    durationMs: report.durationMs,
    observationScore: report.observationScore,
    findings: report.findings.map((item) => ({
      severity: item.severity,
      kind: item.kind,
      category: item.category,
      title: item.title,
    })),
    technologies: report.technologies.map((item) => ({
      name: item.name,
      category: item.category,
      confidence: item.confidence,
    })),
    browser: {
      status: report.browser.status,
      title: report.browser.title,
      mainStatus: report.browser.mainStatus,
      consoleErrors: report.browserErrors.filter((item) => item.type === 'console').length,
      pageErrors: report.browserErrors.filter((item) => item.type === 'pageerror').length,
      failedResources: report.failedResources.length,
    },
    page: {
      title: report.pageMetadata.title,
      description: report.pageMetadata.metaDescription,
      language: report.pageMetadata.lang,
      images: report.pageMetadata.images,
      links: report.pageMetadata.links
        ? {
            total: report.pageMetadata.links.total,
            internal: report.pageMetadata.links.internalCount,
            external: report.pageMetadata.links.externalCount,
          }
        : null,
      linkChecks: report.pageMetadata.linkChecks,
    },
    security: {
      https: report.security.https,
      csp: report.security.csp?.present,
      hsts: report.security.hsts?.present,
      missingHeaders: report.security.missingHeaders,
    },
    note: 'Smoke run only — this report was NOT saved to MongoDB.',
  }

  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
} catch (error) {
  console.error(`[smoke] Scan failed: ${error.code || 'ERROR'} — ${error.message}`)
  process.exit(1)
}
