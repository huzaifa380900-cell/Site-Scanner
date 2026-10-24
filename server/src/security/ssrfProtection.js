import ipaddr from 'ipaddr.js'
import { config } from '../config/env.js'
import { AppError } from '../utils/errors.js'
import { resolveAll } from './dns.js'

/**
 * Server-side SSRF policy for Site Scanner.
 *
 * Every outbound scanner request (HTTP client, redirect hop, browser
 * subresource and WebSocket) is validated here. Validation resolves the
 * hostname and returns the exact IP addresses that are allowed to be used for
 * the connection. Callers MUST connect through those addresses (see
 * `pinnedLookup.js` / `safeHttpClient.js`) instead of letting the network
 * library resolve the hostname a second time.
 */

export const TARGET_NOT_ALLOWED_MESSAGE = 'This URL is not allowed for security reasons.'

const MAX_URL_LENGTH = 2048
const MAX_HOSTNAME_LENGTH = 253

/** Hostnames and bare names that must never be contacted. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'instance-data.ec2.internal',
  'metadata.azure.com',
  'metadata.tencentyun.com',
  'kubernetes',
  'kubernetes.default',
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
])

/** Non-public name suffixes (mDNS, private DNS, internal service discovery). */
const BLOCKED_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.localdomain',
  '.internal',
  '.intranet',
  '.lan',
  '.home.arpa',
  '.home',
  '.corp',
  '.svc',
  '.cluster.local',
  '.arpa',
]

/** Ports that are always rejected even if an operator widens the allowlist. */
const ALWAYS_BLOCKED_PORTS = new Set([
  0, 22, 23, 25, 53, 110, 143, 389, 445, 465, 587, 993, 995, 1433, 1521, 2375, 2376, 3306, 3389,
  5432, 5900, 6379, 7001, 8000, 8008, 8081, 9000, 9042, 9200, 9300, 11211, 27017, 27018,
])

const EXTRA_BLOCKED_V4 = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.31.196.0/24',
  '192.52.193.0/24',
  '192.88.99.0/24',
  '192.168.0.0/16',
  '192.175.48.0/24',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '255.255.255.255/32',
].map((cidr) => ipaddr.parseCIDR(cidr))

/** IPv6 ranges that some parsers still classify as unicast but are not global. */
const EXTRA_BLOCKED_V6 = [
  'fec0::/10', // deprecated site-local
  '3fff::/20', // RFC 9637 documentation prefix
  '2001:2::/48', // benchmarking
  '2001:10::/28', // ORCHID (deprecated)
  '2001:20::/28', // ORCHIDv2
  '2001:db8::/32', // documentation
  '5f00::/8', // SRv6 SIDs
].map((cidr) => ipaddr.parseCIDR(cidr))

export class SsrfError extends AppError {
  constructor(code, message, { statusCode = 400, details, cause } = {}) {
    super(code, message, { statusCode, details, expose: true, cause })
    this.name = 'SsrfError'
  }
}

function blocked(code = 'TARGET_NOT_ALLOWED', message = TARGET_NOT_ALLOWED_MESSAGE, statusCode = 400) {
  return new SsrfError(code, message, { statusCode })
}

function invalidUrl(message = 'Enter a valid absolute URL, for example https://example.com.') {
  return new SsrfError('INVALID_URL', message, { statusCode: 400 })
}

/** Lowercase, strip IPv6 brackets and a single trailing dot. */
export function normalizeHostname(input) {
  let hostname = String(input ?? '').trim().toLowerCase()
  if (hostname.startsWith('[') && hostname.endsWith(']')) hostname = hostname.slice(1, -1)
  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1)
  return hostname
}

export function isBlockedHostname(hostname) {
  const normalized = normalizeHostname(hostname)
  if (!normalized) return true
  if (BLOCKED_HOSTNAMES.has(normalized)) return true
  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return true
  if (normalized === '0' || normalized === '[::]' || normalized === '::') return true
  return false
}

/**
 * Validate a single resolved IP address.
 * Returns `{ address, family }` for public unicast addresses, otherwise throws.
 */
export function assertPublicAddress(rawAddress) {
  if (typeof rawAddress !== 'string' || rawAddress.trim() === '') {
    throw blocked('INVALID_ADDRESS')
  }
  const candidate = rawAddress.trim()

  // Link-local IPv6 zone identifiers (fe80::1%eth0) must never be accepted.
  if (candidate.includes('%')) throw blocked('PROHIBITED_ADDRESS')

  let parsed
  try {
    parsed = ipaddr.parse(candidate)
  } catch {
    throw blocked('INVALID_ADDRESS')
  }

  if (parsed.kind() === 'ipv6') {
    if (parsed.zoneId) throw blocked('PROHIBITED_ADDRESS')

    // IPv4-mapped IPv6 (::ffff:127.0.0.1) is evaluated as its IPv4 value.
    if (parsed.isIPv4MappedAddress()) {
      parsed = parsed.toIPv4Address()
    } else {
      // Deprecated IPv4-compatible IPv6 addresses (::127.0.0.1) and other
      // IPv4-embedding transitions are rejected outright.
      const parts = parsed.parts
      const firstSixZero = parts.slice(0, 6).every((part) => part === 0)
      if (firstSixZero) throw blocked('PROHIBITED_ADDRESS')
      if (EXTRA_BLOCKED_V6.some((range) => parsed.match(range))) {
        throw blocked('PROHIBITED_ADDRESS')
      }
    }
  }

  if (parsed.kind() === 'ipv4' && EXTRA_BLOCKED_V4.some((range) => parsed.match(range))) {
    throw blocked('PROHIBITED_ADDRESS')
  }

  const range = parsed.range()
  if (range !== 'unicast') {
    // private, loopback, linkLocal, multicast, reserved, unspecified,
    // broadcast, carrierGradeNat, uniqueLocal, 6to4, teredo, rfc6052 ...
    throw blocked('PROHIBITED_ADDRESS')
  }

  return {
    address: parsed.toString(),
    family: parsed.kind() === 'ipv4' ? 4 : 6,
  }
}

export function isPublicAddress(address) {
  try {
    assertPublicAddress(address)
    return true
  } catch {
    return false
  }
}

/** Parse a literal IP hostname without performing DNS. Returns null when not an IP. */
export function parseIpLiteral(hostname) {
  try {
    return assertPublicAddress(normalizeHostname(hostname))
  } catch (error) {
    if (error instanceof SsrfError && (error.code === 'PROHIBITED_ADDRESS' || error.code === 'INVALID_ADDRESS')) {
      return null
    }
    return null
  }
}

function isAlternateNumericHost(hostname) {
  // Decimal (2130706433), hex (0x7f000001) and short/partial IPv4 notation.
  // If it is not a normal public IP literal, fail closed instead of relying on
  // a resolver's legacy inet_aton style interpretation.
  return /^(0x[0-9a-f]+|[0-9]+)(\.(0x[0-9a-f]+|[0-9]+)){0,3}$/i.test(hostname)
}

function resolvePort(protocol, rawPort) {
  if (rawPort === '') return protocol === 'https:' ? 443 : 80
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw blocked('PORT_NOT_ALLOWED', 'That port is not allowed for scanning.')
  }
  return port
}

export function assertAllowedPort(port, allowedPorts = config.allowedPorts) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw blocked('PORT_NOT_ALLOWED', 'That port is not allowed for scanning.')
  }
  if (ALWAYS_BLOCKED_PORTS.has(port)) {
    throw blocked('PORT_NOT_ALLOWED', 'That port is not allowed for scanning.')
  }
  if (!allowedPorts.has(port)) {
    throw blocked('PORT_NOT_ALLOWED', 'That port is not allowed for scanning.')
  }
}

/**
 * Validate a URL against the SSRF policy and resolve its destination.
 *
 * @param {string} rawUrl
 * @param {object} [options]
 * @param {Set<number>} [options.allowedPorts]
 * @param {Map} [options.dnsCache] - shared cache of validated DNS answers
 * @param {number} [options.dnsCacheTtlMs]
 * @param {Function} [options.resolveDns] - injectable resolver (tests)
 * @returns {Promise<{url:string, hostname:string, port:number, protocol:string,
 *   addresses:Array<{address:string, family:number}>, isIpLiteral:boolean}>}
 */
export async function validateTargetUrl(rawUrl, options = {}) {
  const {
    allowedPorts = config.allowedPorts,
    dnsCache = null,
    dnsCacheTtlMs = config.dnsCacheTtlMs,
    resolveDns = resolveAll,
  } = options

  if (typeof rawUrl !== 'string') throw invalidUrl()
  const input = rawUrl.trim()
  if (!input) throw invalidUrl()
  if (input.length > MAX_URL_LENGTH) {
    throw invalidUrl('The URL is too long. Please use a shorter URL.')
  }
  if (/[\u0000-\u001f\u007f]/.test(input)) {
    throw invalidUrl('The URL contains invalid control characters.')
  }

  let parsed
  try {
    parsed = new URL(input)
  } catch {
    throw invalidUrl()
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfError('UNSUPPORTED_PROTOCOL', 'Only http:// and https:// URLs are supported.', {
      statusCode: 400,
    })
  }

  if (parsed.username !== '' || parsed.password !== '') {
    throw new SsrfError('CREDENTIALS_NOT_ALLOWED', 'URLs containing usernames or passwords are not allowed.', {
      statusCode: 400,
    })
  }

  const hostname = normalizeHostname(parsed.hostname)
  if (!hostname) throw invalidUrl('The URL does not contain a valid hostname.')
  if (hostname.length > MAX_HOSTNAME_LENGTH) throw invalidUrl('The URL hostname is too long.')
  if (hostname.includes('%')) {
    throw blocked('BLOCKED_HOSTNAME')
  }
  if (isBlockedHostname(hostname)) {
    throw blocked('BLOCKED_HOSTNAME')
  }

  const port = resolvePort(parsed.protocol, parsed.port)
  assertAllowedPort(port, allowedPorts)

  // Hash fragments are never sent to servers; strip for a canonical URL.
  parsed.hash = ''

  // Literal IP destination: no DNS trusted, inspect it directly.
  let literal = null
  try {
    literal = assertPublicAddress(hostname)
  } catch (error) {
    if (error instanceof SsrfError && error.code === 'PROHIBITED_ADDRESS') {
      throw blocked('PROHIBITED_ADDRESS')
    }
    // Not an IP literal; fall through to DNS.
    if (!(error instanceof SsrfError) || error.code !== 'INVALID_ADDRESS') throw error
  }

  if (literal) {
    return {
      url: parsed.href,
      // Connect to the canonical validated address, never the raw user input.
      hostname: literal.address,
      hostHeader: parsed.host,
      port,
      protocol: parsed.protocol,
      addresses: [{ address: literal.address, family: literal.family }],
      isIpLiteral: true,
    }
  }

  if (isAlternateNumericHost(hostname)) {
    throw blocked('BLOCKED_HOSTNAME')
  }

  // Resolve through the shared cache. Cached entries contain the already
  // validated addresses, so callers still connect to a pinned destination.
  let addresses = null
  const cacheKey = `${hostname}:${port}`
  const cached = dnsCache?.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    addresses = cached.addresses
  } else {
    let records
    try {
      records = await resolveDns(hostname)
    } catch (error) {
      throw new SsrfError('DNS_RESOLUTION_FAILED', 'The website hostname could not be resolved.', {
        statusCode: 400,
        cause: error,
      })
    }
    if (!Array.isArray(records) || records.length === 0) {
      throw new SsrfError('DNS_RESOLUTION_FAILED', 'The website hostname could not be resolved.', {
        statusCode: 400,
      })
    }

    // Every answer must be public. A single private answer poisons the host.
    const validated = []
    for (const record of records) {
      const value = typeof record === 'string' ? record : record?.address
      const checked = assertPublicAddress(value)
      if (!validated.some((existing) => existing.address === checked.address)) {
        validated.push(checked)
      }
    }
    if (validated.length === 0) {
      throw blocked('PROHIBITED_ADDRESS')
    }
    addresses = validated
    if (dnsCache) {
      dnsCache.set(cacheKey, { addresses, expiresAt: Date.now() + dnsCacheTtlMs })
    }
  }

  return {
    url: parsed.href,
    hostname,
    port,
    protocol: parsed.protocol,
    addresses,
    isIpLiteral: false,
  }
}

/**
 * Shared, bounded guard used by the Playwright request interception layer.
 * It performs the same policy checks as the HTTP client and caches only
 * validated DNS answers for a short period.
 */
export function createRequestGuard({ allowedPorts = config.allowedPorts, ttlMs = config.dnsCacheTtlMs } = {}) {
  const dnsCache = new Map()
  return {
    dnsCache,
    async check(rawUrl) {
      const parsed = new URL(rawUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new SsrfError('UNSUPPORTED_PROTOCOL', 'Only HTTP and HTTPS resources are allowed.', {
          statusCode: 400,
        })
      }
      return validateTargetUrl(parsed.href, { allowedPorts, dnsCache, dnsCacheTtlMs: ttlMs })
    },
  }
}

/** Remove userinfo and query values for safe logging. */
export function redactUrlForLog(rawUrl) {
  try {
    const url = new URL(String(rawUrl))
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch {
    return '[unparseable-url]'
  }
}
