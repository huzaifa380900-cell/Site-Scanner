/**
 * Passive HTTP and security-header observations.
 *
 * A missing header is a configuration observation / recommendation, never
 * proof of an exploitable vulnerability. Nothing here probes, exploits or
 * authenticates against the target.
 */

const HEADER_SPECS = [
  {
    key: 'content-security-policy',
    label: 'Content-Security-Policy',
    severity: 'low',
    description: 'No Content-Security-Policy header was returned for the main document.',
    recommendation:
      'Define a Content-Security-Policy that restricts script, style and frame sources, starting in report-only mode before enforcement.',
  },
  {
    key: 'strict-transport-security',
    label: 'Strict-Transport-Security',
    severity: 'low',
    httpsOnly: true,
    description: 'HSTS is not enabled, so browsers are not instructed to require HTTPS for this host.',
    recommendation:
      'After confirming HTTPS works on all subdomains, send Strict-Transport-Security with a long max-age and includeSubDomains.',
  },
  {
    key: 'x-content-type-options',
    label: 'X-Content-Type-Options',
    severity: 'low',
    description: 'The X-Content-Type-Options header is missing, so browsers may MIME-sniff responses.',
    recommendation: 'Send X-Content-Type-Options: nosniff on HTML and asset responses.',
  },
  {
    key: 'referrer-policy',
    label: 'Referrer-Policy',
    severity: 'info',
    description: 'No Referrer-Policy header was returned.',
    recommendation: 'Send a Referrer-Policy such as strict-origin-when-cross-origin.',
  },
  {
    key: 'permissions-policy',
    label: 'Permissions-Policy',
    severity: 'info',
    description: 'No Permissions-Policy header was returned.',
    recommendation:
      'Send a Permissions-Policy that disables browser features the site does not use (camera, microphone, geolocation, etc.).',
  },
]

function finding({ title, severity, kind, category, description, evidence, recommendation, affectedUrl = null, confidence = 'high' }) {
  return { title, severity, kind, category, description, evidence, recommendation, affectedUrl, confidence }
}

export function analyzeSecurity({ headers = {}, finalUrl = '', page = null, httpStatus = 0 }) {
  const normalized = {}
  for (const [key, value] of Object.entries(headers)) normalized[key.toLowerCase()] = String(value)
  const isHttps = String(finalUrl).startsWith('https://')

  const headerState = {}
  for (const [key, value] of Object.entries(normalized)) {
    if (key === 'set-cookie') continue
    headerState[key] = { present: true, value }
  }

  const findings = []
  const missing = []

  for (const spec of HEADER_SPECS) {
    const value = normalized[spec.key]
    if (value !== undefined) continue
    if (spec.httpsOnly && !isHttps) continue
    missing.push(spec.key)
    findings.push(
      finding({
        title: `${spec.label} header is not set`,
        severity: spec.severity,
        kind: 'recommendation',
        category: 'security-headers',
        description: spec.description,
        evidence: `The main response (HTTP ${httpStatus || 'unknown'}) did not include a ${spec.label} header.`,
        recommendation: spec.recommendation,
        affectedUrl: finalUrl,
      }),
    )
  }

  // CSP quality observations (only when the header is actually present).
  const csp = normalized['content-security-policy']
  if (csp) {
    if (/unsafe-inline/i.test(csp)) {
      findings.push(
        finding({
          title: 'Content-Security-Policy allows inline code',
          severity: 'info',
          kind: 'observation',
          category: 'security-headers',
          description:
            'The CSP contains unsafe-inline, which permits inline script or style execution and reduces the protection the policy provides.',
          evidence: `Content-Security-Policy: ${csp.slice(0, 240)}`,
          recommendation: 'Replace inline handlers/styles with nonces or hashes and remove unsafe-inline where practical.',
          affectedUrl: finalUrl,
        }),
      )
    }
    if (/unsafe-eval/i.test(csp)) {
      findings.push(
        finding({
          title: 'Content-Security-Policy allows eval()',
          severity: 'info',
          kind: 'observation',
          category: 'security-headers',
          description: 'The CSP contains unsafe-eval, permitting dynamic code evaluation.',
          evidence: `Content-Security-Policy: ${csp.slice(0, 240)}`,
          recommendation: 'Remove unsafe-eval and refactor code that relies on string-based evaluation.',
          affectedUrl: finalUrl,
        }),
      )
    }
  }

  // HSTS duration observation.
  const hsts = normalized['strict-transport-security']
  if (hsts) {
    const match = /max-age\s*=\s*(\d+)/i.exec(hsts)
    const maxAge = match ? Number(match[1]) : 0
    if (maxAge > 0 && maxAge < 15552000) {
      findings.push(
        finding({
          title: 'HSTS max-age is shorter than 180 days',
          severity: 'info',
          kind: 'observation',
          category: 'security-headers',
          description: 'The HSTS policy is active but short-lived, which limits protection between visits.',
          evidence: `Strict-Transport-Security: ${hsts.slice(0, 200)}`,
          recommendation: 'Increase max-age to at least 15552000 seconds (180 days) once HTTPS is confirmed stable.',
          affectedUrl: finalUrl,
        }),
      )
    }
  }

  // Framing protection: X-Frame-Options or CSP frame-ancestors.
  const hasFrameAncestors = Boolean(csp && /frame-ancestors/i.test(csp))
  const xfo = normalized['x-frame-options']
  const framingProtection = xfo ? 'x-frame-options' : hasFrameAncestors ? 'csp-frame-ancestors' : 'none'
  if (framingProtection === 'none') {
    missing.push('x-frame-options')
    findings.push(
      finding({
        title: 'No framing protection observed',
        severity: 'low',
        kind: 'recommendation',
        category: 'security-headers',
        description:
          'Neither X-Frame-Options nor a CSP frame-ancestors directive was observed, so clickjacking protection is not advertised.',
        evidence: 'X-Frame-Options is absent and the Content-Security-Policy (if any) has no frame-ancestors directive.',
        recommendation: "Send Content-Security-Policy: frame-ancestors 'self' (or an explicit allowlist) on pages that should not be framed.",
        affectedUrl: finalUrl,
      }),
    )
  }

  // Plain HTTP.
  if (!isHttps) {
    findings.push(
      finding({
        title: 'Page is served without HTTPS',
        severity: 'high',
        kind: 'potential-issue',
        category: 'transport',
        description:
          'The final page was loaded over plain HTTP. Content and form submissions can be read or modified by anyone on the network path.',
        evidence: `Final URL uses http:// (${finalUrl}).`,
        recommendation: 'Serve the site over HTTPS with a valid certificate and redirect all HTTP requests to HTTPS.',
        affectedUrl: finalUrl,
      }),
    )
  }

  // Mixed content from HTML analysis.
  if (page?.mixedContent?.count > 0) {
    const examples = page.mixedContent.candidates.slice(0, 5)
    findings.push(
      finding({
        title: 'HTTPS page references insecure HTTP resources',
        severity: 'medium',
        kind: 'potential-issue',
        category: 'transport',
        description:
          'The page is served over HTTPS but references subresources over plain HTTP. Modern browsers may block these resources as mixed content.',
        evidence: `${page.mixedContent.count} insecure subresource reference(s), for example:\n${examples.join('\n')}`,
        recommendation: 'Load every script, stylesheet, image and iframe over HTTPS (or use protocol-relative/self-hosted assets).',
        affectedUrl: finalUrl,
      }),
    )
  }

  if (page?.forms?.insecureActionCount > 0) {
    findings.push(
      finding({
        title: 'Form submits over insecure HTTP',
        severity: 'high',
        kind: 'potential-issue',
        category: 'transport',
        description: 'At least one form action uses http://, which would transmit user input without transport encryption.',
        evidence: `${page.forms.insecureActionCount} form action(s) begin with http://.`,
        recommendation: 'Point form actions at HTTPS endpoints and redirect legacy HTTP submissions.',
        affectedUrl: finalUrl,
      }),
    )
  }

  // Version disclosure.
  const poweredBy = normalized['x-powered-by']
  if (poweredBy) {
    findings.push(
      finding({
        title: 'X-Powered-By header discloses server technology',
        severity: 'info',
        kind: 'observation',
        category: 'server-configuration',
        description: 'The response advertises the server-side technology stack, which helps attackers narrow their targeting.',
        evidence: `X-Powered-By: ${poweredBy.slice(0, 200)}`,
        recommendation: 'Remove the X-Powered-By header unless it is intentionally required.',
        affectedUrl: finalUrl,
      }),
    )
  }

  const server = normalized['server']
  if (server && /\/\d+\.\d+/.test(server)) {
    findings.push(
      finding({
        title: 'Server header exposes a software version',
        severity: 'info',
        kind: 'observation',
        category: 'server-configuration',
        description: 'The Server response header includes a version number, which can help fingerprint known issues.',
        evidence: `Server: ${server.slice(0, 200)}`,
        recommendation: 'Configure the server to omit or generalize its version banner.',
        affectedUrl: finalUrl,
      }),
    )
  }

  const summary = {
    https: isHttps,
    framingProtection,
    hsts: hsts ? { present: true, value: hsts } : { present: false },
    csp: csp
      ? {
          present: true,
          hasUnsafeInline: /unsafe-inline/i.test(csp),
          hasUnsafeEval: /unsafe-eval/i.test(csp),
          hasFrameAncestors,
          value: csp.slice(0, 600),
        }
      : { present: false },
    xContentTypeOptions: normalized['x-content-type-options'] || null,
    referrerPolicy: normalized['referrer-policy'] || null,
    permissionsPolicy: normalized['permissions-policy'] || null,
    xFrameOptions: xfo || null,
    server: server ? server.slice(0, 200) : null,
    poweredBy: poweredBy ? poweredBy.slice(0, 200) : null,
    missingHeaders: missing,
    mixedContentCount: page?.mixedContent?.count ?? 0,
    headerCount: Object.keys(headerState).length,
  }

  return { findings, summary }
}
