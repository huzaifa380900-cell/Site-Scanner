import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveAll } from '../src/security/dns.js'

vi.mock('../src/security/dns.js', () => ({
  resolveAll: vi.fn(),
}))

import { createRequestGuard } from '../src/security/ssrfProtection.js'
import { createBrowserRequestHandler } from '../src/security/browserRequestHandler.js'

function fakeRoute(url) {
  return {
    request: () => ({ url: () => url }),
    continue: vi.fn(async () => {}),
    abort: vi.fn(async () => {}),
  }
}

beforeEach(() => {
  resolveAll.mockReset()
  resolveAll.mockImplementation(async (hostname) => {
    if (hostname === 'internal.example.test') return [{ address: '10.0.0.12', family: 4 }]
    if (hostname === 'mixed.example.test') {
      return [
        { address: '93.184.216.34', family: 4 },
        { address: '169.254.169.254', family: 4 },
      ]
    }
    return [{ address: '93.184.216.34', family: 4 }]
  })
})

describe('Playwright browser request handler', () => {
  it('continues an allowed public subresource request', async () => {
    const route = fakeRoute('https://cdn.example.com/app.js')
    const handler = createBrowserRequestHandler({ guard: createRequestGuard() })
    const result = await handler(route)

    expect(result.allowed).toBe(true)
    expect(route.continue).toHaveBeenCalledTimes(1)
    expect(route.abort).not.toHaveBeenCalled()
  })

  it('aborts a browser request to a private IP literal', async () => {
    const route = fakeRoute('http://127.0.0.1:8080/admin')
    const onBlocked = vi.fn()
    const handler = createBrowserRequestHandler({ guard: createRequestGuard(), onBlocked })
    const result = await handler(route)

    expect(result.allowed).toBe(false)
    expect(result.code).toBe('PROHIBITED_ADDRESS')
    expect(route.abort).toHaveBeenCalledWith('blockedbyclient')
    expect(route.continue).not.toHaveBeenCalled()
    expect(onBlocked).toHaveBeenCalledTimes(1)
    expect(onBlocked.mock.calls[0][0].redactedUrl).toBe('http://127.0.0.1:8080/admin')
  })

  it('aborts a browser request to the cloud metadata service', async () => {
    const route = fakeRoute('http://169.254.169.254/latest/meta-data/')
    const handler = createBrowserRequestHandler({ guard: createRequestGuard() })
    const result = await handler(route)

    expect(result.allowed).toBe(false)
    expect(route.abort).toHaveBeenCalledWith('blockedbyclient')
  })

  it('aborts a hostname that resolves to a private address', async () => {
    const route = fakeRoute('https://internal.example.test/secret')
    const handler = createBrowserRequestHandler({ guard: createRequestGuard() })
    const result = await handler(route)

    expect(result.allowed).toBe(false)
    expect(result.code).toBe('PROHIBITED_ADDRESS')
    expect(route.abort).toHaveBeenCalled()
  })

  it('aborts a hostname with mixed public and private DNS answers', async () => {
    const route = fakeRoute('https://mixed.example.test/image.png')
    const handler = createBrowserRequestHandler({ guard: createRequestGuard() })
    const result = await handler(route)

    expect(result.allowed).toBe(false)
    expect(route.abort).toHaveBeenCalled()
  })

  it('does not require network validation for local data: MRIs', async () => {
    const route = fakeRoute('data:image/png;base64,iVBORw0KGgo=')
    const handler = createBrowserRequestHandler({ guard: createRequestGuard() })
    const result = await handler(route)

    expect(result.allowed).toBe(true)
    expect(route.continue).toHaveBeenCalled()
    expect(resolveAll).not.toHaveBeenCalled()
  })

  it('survives a route that was already handled', async () => {
    const route = fakeRoute('http://10.0.0.1/')
    route.abort.mockRejectedValueOnce(new Error('Route is already handled'))
    const handler = createBrowserRequestHandler({ guard: createRequestGuard() })
    await expect(handler(route)).resolves.toMatchObject({ allowed: false })
  })

  it('fails closed when destination validation throws unexpectedly', async () => {
    const guard = { check: vi.fn().mockRejectedValue(new Error('resolver exploded')) }
    const route = fakeRoute('https://example.com/')
    const handler = createBrowserRequestHandler({ guard })
    const result = await handler(route)

    expect(result.allowed).toBe(false)
    expect(route.abort).toHaveBeenCalled()
  })
})
