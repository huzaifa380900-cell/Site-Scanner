import { createHash } from 'node:crypto'

/**
 * Convert raw observations into a stable, deduplicated findings list.
 *
 * Finding kinds:
 *   - observation   : confirmed technical fact
 *   - potential-issue: likely problem that needs human verification
 *   - recommendation: best-practice improvement
 *   - inconclusive  : a check could not be completed
 *
 * Severity reflects potential impact, not proof of exploitation.
 */

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
export const SEVERITY_WEIGHTS = { critical: 30, high: 15, medium: 8, low: 3, info: 0 }

function finding({ title, severity = 'info', kind = 'observation', category = 'general', description = '', evidence = '', recommendation = '', affectedUrl = null, confidence = 'medium' }) {
  return { title, severity, kind, category, description, evidence, recommendation, affectedUrl, confidence }
}

function findingId(item) {
  const key = `${item.category}|${item.title}|${item.affectedUrl || ''}`.toLowerCase()
  return createHash('sha1').update(key).digest('hex').slice(0, 12)
}

export function dedupeFindings(items) {
  const byKey = new Map()
  for (const item of items) {
    if (!item || !item.title) continue
    const id = findingId(item)
    const existing = byKey.get(id)
    if (!existing) {
      byKey.set(id, { ...item, id })
      continue
    }
    // Merge evidence rather than dropping a second distinct observation.
    if (item.evidence && !existing.evidence.includes(item.evidence)) {
      existing.evidence = `${existing.evidence}\n${item.evidence}`.slice(0, 2000)
    }
  }
  return [...byKey.values()].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.title.localeCompare(b.title),
  )
}

/**
 * Heuristic website-health score (0–100), NOT a security certification.
 * Every finding is deducted once, weighted by severity. Info findings are
 * advisory and never change the score. Returns null when no evidence exists.
 */
export function calculateObservationScore(findings, { evaluated = true } = {}) {
  if (!evaluated || !Array.isArray(findings)) return null
  let deduction = 0
  for (const item of findings) {
    deduction += SEVERITY_WEIGHTS[item.severity] ?? 0
  }
  return Math.max(0, Math.round(100 - Math.min(100, deduction)))
}

export function summarizeFindings(findings = []) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  const byCategory = {}
  for (const item of findings) {
    if (bySeverity[item.severity] !== undefined) bySeverity[item.severity] += 1
    byCategory[item.category] = (byCategory[item.category] || 0) + 1
  }
  return { total: findings.length, bySeverity, byCategory }
}

function browserScope(url, targetUrl) {
  if (!url) return 'unknown'
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const targetHost = new URL(targetUrl).hostname.replace(/^www\./, '')
    return host === targetHost ? 'same-origin' : 'third-party'
  } catch {
    return 'unknown'
  }
}

function truncate(value, max = 300) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function buildFindings({ http, page, browser, securityFindings = [], linkChecks = null }) {
  const findings = [...securityFindings]
  const finalUrl = http?.finalUrl || page?.finalUrl || null
  const status = Number(http?.statusCode) || 0

  // ------------------------------------------------------------ HTTP status
  if (status >= 500) {
    findings.push(
      finding({
        title: `Page returned HTTP ${status}`,
        severity: 'high',
        kind: 'observation',
        category: 'http',
        description: 'The main document responded with a server error, so the page may not render or function correctly.',
        evidence: `Main document response: HTTP ${status}${http.statusMessage ? ` ${http.statusMessage}` : ''} for ${finalUrl}`,
        recommendation: 'Inspect server logs for this URL and confirm the route is expected to return a successful response.',
        affectedUrl: finalUrl,
        confidence: 'high',
      }),
    )
  } else if (status >= 400) {
    findings.push(
      finding({
        title: `Page returned HTTP ${status}`,
        severity: 'medium',
        kind: 'observation',
        category: 'http',
        description:
          'The main document responded with a client error. This can be intentional (for example bot protection) or indicate a broken URL.',
        evidence: `Main document response: HTTP ${status}${http.statusMessage ? ` ${http.statusMessage}` : ''} for ${finalUrl}`,
        recommendation: 'Verify the URL is publicly reachable without authentication and check the server configuration for this route.',
        affectedUrl: finalUrl,
        confidence: 'high',
      }),
    )
  }

  if (http?.redirects?.length) {
    findings.push(
      finding({
        title: `Page redirected ${http.redirects.length} time(s)`,
        severity: 'info',
        kind: 'observation',
        category: 'http',
        description: 'The scanner followed redirects after validating every destination against the safety policy.',
        evidence: http.redirects
          .map((hop) => `${hop.statusCode}: ${hop.from} → ${hop.to}`)
          .join('\n')
          .slice(0, 1200),
        recommendation: 'Review redirect chains periodically; each hop adds latency.',
        affectedUrl: finalUrl,
        confidence: 'high',
      }),
    )
  }

  // ------------------------------------------------------------- metadata
  if (page) {
    if (!page.title) {
      findings.push(
        finding({
          title: 'Page title is missing',
          severity: 'medium',
          kind: 'potential-issue',
          category: 'metadata',
          description: 'No non-empty <title> element was found, which affects search results, browser tabs and accessibility.',
          evidence: 'The parsed document contained no non-empty <title> element.',
          recommendation: 'Add a unique, descriptive title (roughly 50–60 characters) to the document head.',
          affectedUrl: finalUrl,
        }),
      )
    } else if (page.title.length < 10) {
      findings.push(
        finding({
          title: 'Page title is unusually short',
          severity: 'low',
          kind: 'observation',
          category: 'metadata',
          description: 'Short titles carry little context for search engines and assistive technology.',
          evidence: `Title (${page.title.length} characters): "${page.title}"`,
          recommendation: 'Use a descriptive title of roughly 50–60 characters.',
          affectedUrl: finalUrl,
        }),
      )
    } else if (page.title.length > 65) {
      findings.push(
        finding({
          title: 'Page title may be truncated in search results',
          severity: 'info',
          kind: 'recommendation',
          category: 'metadata',
          description: 'The title is longer than typical search-result display limits.',
          evidence: `Title (${page.title.length} characters): "${truncate(page.title, 120)}"`,
          recommendation: 'Keep titles concise (roughly 50–60 characters).',
          affectedUrl: finalUrl,
        }),
      )
    }

    if (!page.metaDescription) {
      findings.push(
        finding({
          title: 'Meta description is missing',
          severity: 'low',
          kind: 'recommendation',
          category: 'metadata',
          description: 'No meta description was found. Search engines may generate their own snippet.',
          evidence: 'No <meta name="description"> content was present.',
          recommendation: 'Add a concise, page-specific meta description (roughly 120–160 characters).',
          affectedUrl: finalUrl,
        }),
      )
    }

    if (!page.viewport) {
      findings.push(
        finding({
          title: 'Responsive viewport meta tag is missing',
          severity: 'medium',
          kind: 'potential-issue',
          category: 'accessibility',
          description: 'Without a viewport meta tag, mobile browsers use a desktop-width layout that is hard to read and tap.',
          evidence: 'No <meta name="viewport"> element was found.',
          recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
          affectedUrl: finalUrl,
        }),
      )
    }

    if (!page.lang) {
      findings.push(
        finding({
          title: 'HTML language is not declared',
          severity: 'low',
          kind: 'recommendation',
          category: 'accessibility',
          description: 'The <html> element has no lang attribute, which screen readers use to choose pronunciation.',
          evidence: 'The <html> element has no non-empty lang attribute.',
          recommendation: 'Add a lang attribute such as <html lang="en">.',
          affectedUrl: finalUrl,
        }),
      )
    }

    if (page.images?.missingAlt > 0) {
      findings.push(
        finding({
          title: 'Images are missing alternative text',
          severity: 'low',
          kind: 'potential-issue',
          category: 'accessibility',
          description: `${page.images.missingAlt} of ${page.images.total} <img> elements have no alt attribute. Decorative images should use alt="".`,
          evidence: page.images.missingAltExamples.length
            ? `Examples:\n${page.images.missingAltExamples.join('\n')}`
            : `${page.images.missingAlt} image(s) without an alt attribute.`,
          recommendation: 'Add meaningful alt text for informative images and alt="" for decorative images.',
          affectedUrl: finalUrl,
        }),
      )
    }

    const h1Count = page.headingStructure?.counts?.h1 ?? 0
    if (page.headingStructure?.total > 0 && h1Count === 0) {
      findings.push(
        finding({
          title: 'Page has no H1 heading',
          severity: 'info',
          kind: 'recommendation',
          category: 'accessibility',
          description: 'No level-one heading was found, which can weaken document structure for assistive technology and search engines.',
          evidence: `${page.headingStructure.total} heading element(s) were found, but none were H1.`,
          recommendation: 'Use a single descriptive H1 that summarises the page.',
          affectedUrl: finalUrl,
        }),
      )
    } else if (h1Count > 1) {
      findings.push(
        finding({
          title: 'Page has multiple H1 headings',
          severity: 'info',
          kind: 'observation',
          category: 'accessibility',
          description: 'Multiple H1 elements were found; this is valid HTML but can flatten the document outline.',
          evidence: `${h1Count} H1 elements were detected.`,
          recommendation: 'Prefer one H1 per page and use H2/H3 for subsections.',
          affectedUrl: finalUrl,
        }),
      )
    }

    if (!page.canonical) {
      findings.push(
        finding({
          title: 'Canonical URL is not declared',
          severity: 'info',
          kind: 'recommendation',
          category: 'metadata',
          description: 'No canonical link was found, so duplicate URL variants may compete in search results.',
          evidence: 'No <link rel="canonical"> element was present.',
          recommendation: 'Declare a canonical URL for pages that can be reached through multiple URL variants.',
          affectedUrl: finalUrl,
        }),
      )
    } else if (page.canonicalMatchesPage === false) {
      findings.push(
        finding({
          title: 'Canonical URL points to a different hostname',
          severity: 'low',
          kind: 'observation',
          category: 'metadata',
          description: 'The canonical URL uses a different host than the scanned page. Confirm this is intentional.',
          evidence: `Page: ${finalUrl}\nCanonical: ${page.canonical}`,
          recommendation: 'Verify the canonical target is the preferred public host and is itself indexable.',
          affectedUrl: page.canonical,
        }),
      )
    }

    if (page.metaRobots && /noindex/i.test(page.metaRobots)) {
      findings.push(
        finding({
          title: 'Page asks search engines not to index it',
          severity: 'info',
          kind: 'observation',
          category: 'metadata',
          description: 'A robots meta tag contains noindex.',
          evidence: `meta robots: ${page.metaRobots}`,
          recommendation: 'Confirm noindex is intentional for this URL.',
          affectedUrl: finalUrl,
        }),
      )
    }

    if (page.metaRefresh) {
      findings.push(
        finding({
          title: 'Meta refresh redirect detected',
          severity: 'info',
          kind: 'observation',
          category: 'metadata',
          description: 'The page uses a meta refresh instead of an HTTP redirect, which is slower and less accessible.',
          evidence: `meta http-equiv="refresh": ${page.metaRefresh}`,
          recommendation: 'Use a server-side 301/302 redirect where possible.',
          affectedUrl: finalUrl,
        }),
      )
    }

    // Version disclosure visible in the generator tag.
    if (page.generator && /wordpress\s*[\d.]+/i.test(page.generator)) {
      findings.push(
        finding({
          title: 'Generator tag discloses the CMS version',
          severity: 'info',
          kind: 'observation',
          category: 'technology',
          description: 'The generator meta tag exposes a version number that can help identify known vulnerabilities.',
          evidence: `meta generator: ${page.generator}`,
          recommendation: 'Remove or generalize the generator meta tag if it is not required.',
          affectedUrl: finalUrl,
        }),
      )
    }

    // Outdated jQuery from an actual script URL.
    for (const url of page.scripts?.sources || []) {
      const match = /jquery[/@-](\d+)\.(\d+)/i.exec(url)
      if (match && Number(match[1]) < 3) {
        findings.push(
          finding({
            title: 'Outdated jQuery version is loaded',
            severity: 'low',
            kind: 'potential-issue',
            category: 'technology',
            description:
              'A jQuery 1.x/2.x build was referenced. These branches no longer receive security fixes and may have known issues.',
            evidence: `Script: ${truncate(url, 250)}`,
            recommendation: 'Upgrade to a supported jQuery release (3.x) or remove jQuery if it is no longer needed.',
            affectedUrl: url,
            confidence: 'medium',
          }),
        )
        break
      }
    }
  }

  // -------------------------------------------------------- broken links
  if (linkChecks && linkChecks.checked > 0 && linkChecks.broken?.length) {
    findings.push(
      finding({
        title: 'Some internal links could not be loaded',
        severity: 'medium',
        kind: 'observation',
        category: 'links',
        description: `${linkChecks.broken.length} of ${linkChecks.checked} checked internal link(s) returned an error or could not be reached.`,
        evidence: linkChecks.broken
          .slice(0, 8)
          .map((item) => `${item.url} → ${item.statusCode ? `HTTP ${item.statusCode}` : item.error || 'unreachable'}`)
          .join('\n'),
        recommendation: 'Fix or remove broken internal links so users and crawlers do not hit dead ends.',
        affectedUrl: finalUrl,
        confidence: 'high',
      }),
    )
  }

  // ------------------------------------------------------------ browser
  if (browser) {
    const targetUrl = browser.finalUrl || finalUrl
    if (browser.status === 'failed' || browser.status === 'unavailable') {
      findings.push(
        finding({
          title: 'Browser checks could not be completed',
          severity: 'info',
          kind: 'inconclusive',
          category: 'browser',
          description:
            'The headless browser could not analyse this page. HTTP and HTML observations are still reported, but runtime errors are unknown.',
          evidence: `Browser status: ${browser.status}${browser.error?.code ? ` (${browser.error.code})` : ''}`,
          recommendation: 'Retry the scan later. If the problem persists, verify the Playwright Chromium installation and server resources.',
          affectedUrl: finalUrl,
          confidence: 'low',
        }),
      )
    }

    if (browser.status === 'completed') {
      if (Number(browser.mainStatus) >= 400) {
        findings.push(
          finding({
            title: `Browser received HTTP ${browser.mainStatus} for the main document`,
            severity: 'high',
            kind: 'observation',
            category: 'browser',
            description: 'The Chromium request for the main document returned an error status.',
            evidence: `Main document response in browser: HTTP ${browser.mainStatus}`,
            recommendation: 'Confirm the page is publicly accessible to normal browsers without bot challenges.',
            affectedUrl: targetUrl,
            confidence: 'high',
          }),
        )
      }

      const sameOriginPageErrors = (browser.pageErrors || []).filter(
        (item) => browserScope(item.url, targetUrl) !== 'third-party',
      )
      if (sameOriginPageErrors.length) {
        findings.push(
          finding({
            title: 'Uncaught JavaScript errors occurred',
            severity: 'medium',
            kind: 'observation',
            category: 'browser',
            description:
              'Uncaught exceptions were raised while the page loaded. These can break interactive features; confirm expected behaviour in a real browser.',
            evidence: sameOriginPageErrors
              .slice(0, 5)
              .map((item) => truncate(item.message, 300))
              .join('\n'),
            recommendation: 'Reproduce the error in DevTools, fix the throwing code path, and add regression coverage.',
            affectedUrl: targetUrl,
            confidence: 'high',
          }),
        )
      }

      const sameOriginConsoleErrors = (browser.consoleErrors || []).filter(
        (item) => browserScope(item.url, targetUrl) !== 'third-party' && !item.blockedByPolicy,
      )
      if (sameOriginConsoleErrors.length) {
        findings.push(
          finding({
            title: 'Browser console errors were logged',
            severity: 'low',
            kind: 'potential-issue',
            category: 'browser',
            description:
              'The page logged console errors. Some are harmless vendor noise, so review each message in context.',
            evidence: sameOriginConsoleErrors
              .slice(0, 5)
              .map((item) => truncate(item.message, 300))
              .join('\n'),
            recommendation: 'Reproduce in a browser console and address the errors that affect user-facing behaviour.',
            affectedUrl: targetUrl,
            confidence: 'medium',
          }),
        )
      }

      const sameOriginFailed = (browser.failedRequests || []).filter(
        (item) => item.scope === 'same-origin' && !item.blockedByPolicy,
      )
      if (sameOriginFailed.length) {
        findings.push(
          finding({
            title: 'Same-origin resources failed to load',
            severity: 'low',
            kind: 'observation',
            category: 'resources',
            description: 'Requests for resources on the site itself failed during the browser session.',
            evidence: sameOriginFailed
              .slice(0, 8)
              .map((item) => `${truncate(item.url, 200)} — ${truncate(item.errorText || 'failed', 120)}`)
              .join('\n'),
            recommendation: 'Check the affected asset paths, server logs and cache configuration.',
            affectedUrl: targetUrl,
            confidence: 'high',
          }),
        )
      }

      const thirdPartyFailed = (browser.failedRequests || []).filter(
        (item) => item.scope === 'third-party' && !item.blockedByPolicy,
      )
      if (thirdPartyFailed.length) {
        findings.push(
          finding({
            title: 'Third-party requests failed',
            severity: 'info',
            kind: 'observation',
            category: 'resources',
            description:
              'Requests to third-party hosts failed. These are often blocked trackers, offline vendors or ad-blocker effects and do not necessarily affect the site.',
            evidence: thirdPartyFailed
              .slice(0, 8)
              .map((item) => `${truncate(item.url, 200)} — ${truncate(item.errorText || 'failed', 120)}`)
              .join('\n'),
            recommendation: 'Review whether the affected third-party integrations are still required.',
            affectedUrl: targetUrl,
            confidence: 'low',
          }),
        )
      }

      const blocked = (browser.failedRequests || []).filter((item) => item.blockedByPolicy)
      if (blocked.length) {
        findings.push(
          finding({
            title: 'Some requests were blocked by the scanner security policy',
            severity: 'info',
            kind: 'observation',
            category: 'security',
            description:
              'The browser attempted requests that the SSRF policy rejected. They are reported for transparency and are not defects in the website.',
            evidence: blocked
              .slice(0, 8)
              .map((item) => truncate(item.url, 250))
              .join('\n'),
            recommendation: 'No action is required unless you are the operator of the blocked destination.',
            affectedUrl: null,
            confidence: 'high',
          }),
        )
      }

      const errorCount =
        (browser.pageErrors?.length || 0) +
        (browser.consoleErrors?.filter((item) => !item.blockedByPolicy)?.length || 0)
      if (errorCount === 0) {
        findings.push(
          finding({
            title: 'No browser console or page errors were observed',
            severity: 'info',
            kind: 'observation',
            category: 'browser',
            description:
              'Chromium loaded the page without console errors or uncaught exceptions during this session. This does not prove the site is bug-free; it only reflects this single automated visit.',
            evidence: `Browser status: ${browser.status}; main document HTTP ${browser.mainStatus ?? 'unknown'}.`,
            recommendation: 'Use functional testing and manual review for deeper coverage.',
            affectedUrl: targetUrl,
            confidence: 'medium',
          }),
        )
      }
    }
  }

  return dedupeFindings(findings)
}
