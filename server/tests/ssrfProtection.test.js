import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveAll } from '../src/security/dns.js'

vi.mock('../src/security/dns.js', () => ({
  resolveAll: vi.fn(),
}))

import { validateTargetUrl, assertPublicAddress, redactUrlForLog } from '../src/security/ssrfProtection.js'
import { createPinnedLookup } from '../src/security/pinnedLookup.js'
import { fetchPage } from '../src/security/safeHttpClient.js'

const PUBLIC_V4 = [{ address: '93.184.216.34', family: 4 }]
const PUBLIC_V6 = [{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]

beforeEach(() => {
  resolveAll.mockReset()
  resolveAll.mockResolvedValue(PUBLIC_V4)
})

describe('SSRF policy — URL validation', () => {
  it.each([
    ['http://localhost'],
    ['http://localhost:8080'],
    ['http://localhost.'],
    ['http://app.localhost'],
    ['http://metadata.google.internal'],
    ['http://metadata'],
    ['http://instance-data'],
    ['http://something.internal'],
    ['http://printer.local'],
    ['http://[::]'],
    ['http://0.0.0.0'],
  ])('rejects local/metadata hostname %s without contacting it', async (url) => {
    await expect(validateTargetUrl(url)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects credentials embedded in the URL', async () => {
    await expect(validateTargetUrl('https://user:secret@example.com')).rejects.toMatchObject({
      code: 'CREDENTIALS_NOT_ALLOWED',
    })
    await expect(validateTargetUrl('https://user@example.com')).rejects.toMatchObject({
      code: 'CREDENTIALS_NOT_ALLOWED',
    })
    await expect(validateTargetUrl('https://:secret@example.com')).rejects.toMatchObject({
      code: 'CREDENTIALS_NOT_ALLOWED',
    })
  })

  it.each([['file:///etc/passwd'], ['ftp://example.com'], ['javascript:alert(1)'], ['data:text/html,hi']])(
    'rejects unsupported protocol %s',
    async (url) => {
      await expect(validateTargetUrl(url)).rejects.toMatchObject({ code: 'UNSUPPORTED_PROTOCOL' })
    },
  )

  it.each([['not a url'], ['http://'], ['https://exa mple.com'], ['']])('rejects malformed URL %j', async (url) => {
    await expect(validateTargetUrl(url)).rejects.toMatchObject({ code: 'INVALID_URL' })
  })

  it.each([['http://example.com:22/'], ['http://example.com:3000/'], ['http://example.com:8081/']])(
    'rejects non-allowlisted port %s',
    async (url) => {
      await expect(validateTargetUrl(url)).rejects.toMatchObject({ code: 'PORT_NOT_ALLOWED' })
    },
  )

  it('accepts a genuine public URL and returns the pinned addresses', async () => {
    const result = await validateTargetUrl('https://example.com/path?q=1#section')
    expect(result.hostname).toBe('example.com')
    expect(result.port).toBe(443)
    expect(result.addresses).toEqual(PUBLIC_V4)
    expect(result.url).toBe('https://example.com/path?q=1')
    expect(resolveAll).toHaveBeenCalledWith('example.com')
  })

  it('accepts public IPv6 answers', async () => {
    resolveAll.mockResolvedValue(PUBLIC_V6)
    const result = await validateTargetUrl('https://example.com')
    expect(result.addresses).toEqual(PUBLIC_V6)
  })
})

describe('SSRF policy — URL redaction', () => {
  it('removes query values and bounds logged URLs to the report schema limit', () => {
    const redacted = redactUrlForLog(`https://example.com/${'a'.repeat(3000)}?token=secret`)

    expect(redacted).toHaveLength(2048)
    expect(redacted).toMatch(/^https:\/\/example\.com\//)
    expect(redacted.endsWith('...')).toBe(true)
    expect(redacted).not.toContain('secret')
  })
})

describe('SSRF policy — IP address classification', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '10.255.255.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.100.100.200',
    '0.0.0.0',
    '255.255.255.255',
    '192.0.2.1',
    '198.18.0.1',
    '224.0.0.1',
    '240.0.0.1',
  ])('rejects prohibited IPv4 %s', (ip) => {
    expect(() => assertPublicAddress(ip)).toThrow()
  })

  it.each([
    '::1',
    'fc00::1',
    'fd12:3456:789a::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '2001:db8::1',
    'fec0::1',
    '3fff::1',
    '2002:7f00:1::1',
    '64:ff9b::7f00:1',
    '::127.0.0.1',
  ])('rejects prohibited IPv6 %s', (ip) => {
    expect(() => assertPublicAddress(ip)).toThrow()
  })

  it('unwraps IPv4-mapped addresses before classification', () => {
    expect(assertPublicAddress('::ffff:8.8.8.8')).toEqual({ address: '8.8.8.8', family: 4 })
  })

  it.each([['8.8.8.8'], ['1.1.1.1'], ['2606:4700:4700::1111']])('accepts public address %s', (ip) => {
    expect(assertPublicAddress(ip).address).toBeTruthy()
  })

  it('rejects IPv6 zone identifiers', () => {
    expect(() => assertPublicAddress('fe80::1%eth0')).toThrow()
  })
})

describe('SSRF policy — DNS responsibility', () => {
  it('rejects a hostname resolving to a private address', async () => {
    resolveAll.mockResolvedValue([{ address: '10.0.0.5', family: 4 }])
    await expect(validateTargetUrl('https://internal.example.com')).rejects.toMatchObject({
      code: 'PROHIBITED_ADDRESS',
    })
  })

  it('rejects a hostname with mixed public and private answers', async () => {
    resolveAll.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '192.168.0.10', family: 4 },
    ])
    await expect(validateTargetUrl('https://mixed.example.com')).rejects.toMatchObject({
      code: 'PROHIBITED_ADDRESS',
    })
  })

  it('rejects a private IPv6 DNS answer', async () => {
    resolveAll.mockResolvedValue([{ address: 'fd00::1', family: 6 }])
    await expect(validateTargetUrl('https://internal6.example.com')).rejects.toMatchObject({
      code: 'PROHIBITED_ADDRESS',
    })
  })

  it('fails closed when DNS resolution fails', async () => {
    resolveAll.mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }))
    await expect(validateTargetUrl('https://does-not-exist.example')).rejects.toMatchObject({
      code: 'DNS_RESOLUTION_FAILED',
    })
  })

  it('fails closed when DNS returns an empty answer', async () => {
    resolveAll.mockResolvedValue([])
    await expect(validateTargetUrl('https://empty.example')).rejects.toBeTruthy()
  })

  it('rejects alternate numeric host representations', async () => {
    for (const url of ['http://2130706433/', 'http://0x7f000001/', 'http://127.1/']) {
      await expect(validateTargetUrl(url)).rejects.toBeTruthy()
    }
  })

  it('caches only validated DNS answers in the shared cache', async () => {
    const dnsCache = new Map()
    await validateTargetUrl('https://example.com', { dnsCache })
    await validateTargetUrl('https://example.com/other', { dnsCache })
    expect(resolveAll).toHaveBeenCalledTimes(1)
  })
})

describe('pinned lookup', () => {
  it('never resolves a hostname independently of validation', async () => {
    const lookup = createPinnedLookup(PUBLIC_V4)
    const result = await new Promise((resolve, reject) => {
      lookup('attacker-controlled.example', { family: 4 }, (error, address, family) =>
        error ? reject(error) : resolve({ address, family }),
      )
    })
    expect(result).toEqual({ address: '93.184.216.34', family: 4 })
  })

  it('supports the all-addresses form used by Happy Eyeballs', async () => {
    const lookup = createPinnedLookup([...PUBLIC_V4, ...PUBLIC_V6])
    const result = await new Promise((resolve, reject) => {
      lookup('attacker-controlled.example', { all: true }, (error, addresses) =>
        error ? reject(error) : resolve(addresses),
      )
    })
    expect(result).toHaveLength(2)
    expect(result.every((entry) => ['93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946'].includes(entry.address))).toBe(true)
  })
})

describe('manual redirect enforcement', () => {
  const htmlResponse = (statusCode = 200, extra = {}) => ({
    statusCode,
    statusMessage: '',
    headers: { 'content-type': 'text/html' },
    body: Buffer.from('<html><title>ok</title></html>'),
    bodyBytes: 30,
    bodyTruncated: false,
    contentType: 'text/html',
    contentEncoding: '',
    ttfbMs: 1,
    totalMs: 2,
    ...extra,
  })

  it('validates the first destination before calling the transport', async () => {
    const perform = vi.fn()
    await expect(
      fetchPage('http://127.0.0.1/admin', { perform, resolveDns: async () => PUBLIC_V4 }),
    ).rejects.toMatchObject({ code: 'PROHIBITED_ADDRESS' })
    expect(perform).not.toHaveBeenCalled()
  })

  it('rejects a redirect from a public URL to a private IP without contacting it', async () => {
    const perform = vi.fn().mockResolvedValue(
      htmlResponse(302, { headers: { location: 'http://127.0.0.1/admin' } }),
    )
    await expect(
      fetchPage('https://example.com', { perform, resolveDns: async () => PUBLIC_V4 }),
    ).rejects.toMatchObject({ code: 'PROHIBITED_ADDRESS' })
    expect(perform).toHaveBeenCalledTimes(1)
  })

  it('rejects a redirect to a hostname that resolves privately', async () => {
    const perform = vi.fn().mockResolvedValue(
      htmlResponse(302, { headers: { location: 'http://internal.example.test/admin' } }),
    )
    const resolver = vi.fn(async (hostname) =>
      hostname === 'internal.example.test'
        ? [{ address: '10.0.0.9', family: 4 }]
        : [{ address: '93.184.216.34', family: 4 }],
    )
    await expect(fetchPage('https://example.com', { perform, resolveDns: resolver })).rejects.toMatchObject({
      code: 'PROHIBITED_ADDRESS',
    })
    expect(perform).toHaveBeenCalledTimes(1)
  })

  it('rejects redirects to unsupported protocols', async () => {
    const perform = vi.fn().mockResolvedValue(
      htmlResponse(302, { headers: { location: 'file:///etc/passwd' } }),
    )
    await expect(
      fetchPage('https://example.com', { perform, resolveDns: async () => PUBLIC_V4 }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROTOCOL' })
  })

  it('stops redirect loops', async () => {
    const perform = vi.fn().mockResolvedValue(
      htmlResponse(302, { headers: { location: 'https://example.com/' } }),
    )
    await expect(
      fetchPage('https://example.com', { perform, resolveDns: async () => PUBLIC_V4 }),
    ).rejects.toMatchObject({ code: 'REDIRECT_LOOP' })
    expect(perform).toHaveBeenCalledTimes(1)
  })

  it('enforces the redirect limit', async () => {
    let counter = 0
    const perform = vi.fn().mockImplementation(async () => {
      counter += 1
      return htmlResponse(302, { headers: { location: `https://example.com/hop-${counter}` } })
    })
    await expect(
      fetchPage('https://example.com', { perform, maxRedirects: 2, resolveDns: async () => PUBLIC_V4 }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REDIRECTS' })
    expect(perform).toHaveBeenCalledTimes(3)
  })

  it('follows a validated public redirect chain and records it', async () => {
    const perform = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse(301, { headers: { location: 'https://www.example.com/' } }))
      .mockResolvedValueOnce(htmlResponse(200))
    const result = await fetchPage('https://example.com', {
      perform,
      resolveDns: async () => PUBLIC_V4,
    })
    expect(result.finalUrl).toBe('https://www.example.com/')
    expect(result.redirects).toEqual([
      { from: 'https://example.com/', to: 'https://www.example.com/', statusCode: 301 },
    ])
    expect(perform).toHaveBeenCalledTimes(2)
  })
})
