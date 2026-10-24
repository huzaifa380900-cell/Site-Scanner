import { redactUrlForLog } from './ssrfProtection.js'

/**
 * Build the Playwright route handler used for every browser request.
 *
 * This is the application-level enforcement layer for browser subresources.
 * The egress proxy is the network-level boundary; both use the same policy.
 * Extracted into its own module so the handler itself can be tested without
 * launching Chromium.
 */
export function createBrowserRequestHandler({ guard, onBlocked, onAllowed } = {}) {
  if (!guard || typeof guard.check !== 'function') {
    throw new Error('createBrowserRequestHandler requires a request guard')
  }

  return async function handleBrowserRoute(route) {
    const request = route.request()
    const url = request.url()

    // data:, blob: and about: resources are local and never reach the network.
    if (!/^https?:/i.test(url)) {
      try {
        await route.continue()
      } catch {
        /* route already handled */
      }
      return { allowed: true, local: true, url }
    }

    try {
      await guard.check(url)
      onAllowed?.(url)
      await route.continue()
      return { allowed: true, url }
    } catch (error) {
      const code = error?.code || 'TARGET_NOT_ALLOWED'
      const redactedUrl = redactUrlForLog(url)
      onBlocked?.({ url, redactedUrl, code })
      try {
        await route.abort('blockedbyclient')
      } catch {
        /* route already handled or page closed */
      }
      return { allowed: false, url, redactedUrl, code }
    }
  }
}
