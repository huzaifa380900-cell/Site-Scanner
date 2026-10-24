import http from 'node:http'
import net from 'node:net'
import { config } from '../config/env.js'
import { createPinnedLookup } from './pinnedLookup.js'
import { normalizeHostname, validateTargetUrl } from './ssrfProtection.js'

/**
 * Loopback enforcing egress proxy used by the Playwright browser.
 *
 * Chromium is launched with `--proxy-server` pointing here and every DNS
 * lookup / TCP connection is performed by this process only after the
 * destination passed the shared SSRF policy. The proxy pins the connection to
 * the validated IP, so Chromium never resolves a hostname itself. TLS is
 * tunnelled end-to-end (no interception), preserving certificate verification
 * and SNI.
 *
 * This is an application-level boundary, not a replacement for network
 * isolation in production (see README).
 */

const HOP_BY_HOP_HEADERS = new Set([
  'proxy-connection',
  'proxy-authorization',
  'proxy-authenticate',
  'connection',
  'keep-alive',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

function formatAuthorityHost(hostname) {
  return net.isIP(hostname) === 6 ? `[${hostname}]` : hostname
}

function splitAuthority(authority, fallbackPort = 443) {
  if (typeof authority !== 'string' || authority === '') {
    throw new Error('Malformed proxy authority')
  }
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']')
    if (end === -1) throw new Error('Malformed IPv6 authority')
    const hostname = authority.slice(1, end)
    const rest = authority.slice(end + 1)
    const port = rest.startsWith(':') ? Number(rest.slice(1)) : fallbackPort
    return { hostname, port }
  }
  const lastColon = authority.lastIndexOf(':')
  if (lastColon === -1) return { hostname: authority, port: fallbackPort }
  return {
    hostname: authority.slice(0, lastColon),
    port: Number(authority.slice(lastColon + 1)),
  }
}

function connectPinned(addresses, port, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let index = 0
    let settled = false

    const attemptNext = () => {
      if (settled) return
      const entry = addresses[index]
      index += 1
      if (!entry) {
        settled = true
        reject(new Error('All validated destinations were unreachable'))
        return
      }

      const socket = net.connect({
        host: entry.address,
        port,
        family: entry.family,
        autoSelectFamily: false,
      })

      let connected = false
      const cleanup = () => {
        socket.removeListener('error', onError)
        socket.removeListener('timeout', onTimeout)
      }
      const onError = () => {
        cleanup()
        socket.destroy()
        attemptNext()
      }
      const onTimeout = () => {
        cleanup()
        socket.destroy()
        attemptNext()
      }

      socket.setTimeout(timeoutMs)
      socket.once('error', onError)
      socket.once('timeout', onTimeout)
      socket.once('connect', () => {
        connected = true
        cleanup()
        socket.setTimeout(0)
        settled = true
        resolve(socket)
      })
      socket.once('close', () => {
        if (!connected) return
      })
    }

    attemptNext()
  })
}

function isPolicyError(error) {
  return (
    error?.name === 'SsrfError' ||
    ['TARGET_NOT_ALLOWED', 'BLOCKED_HOSTNAME', 'PROHIBITED_ADDRESS', 'PORT_NOT_ALLOWED', 'UNSUPPORTED_PROTOCOL', 'CREDENTIALS_NOT_ALLOWED', 'INVALID_URL'].includes(
      error?.code,
    )
  )
}

function respondPlain(res, statusCode, message) {
  if (res.headersSent) {
    res.destroy()
    return
  }
  res.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8', connection: 'close' })
  res.end(message)
}

function respondSocket(socket, statusLine, body) {
  const payload = Buffer.byteLength(body)
  socket.end(
    `HTTP/1.1 ${statusLine}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${payload}\r\nConnection: close\r\n\r\n${body}`,
  )
}

/**
 * Start the proxy on an ephemeral loopback port.
 * @returns {Promise<{url:string, port:number, close:Function, blockedLog:Array, server:http.Server}>}
 */
export async function startEgressProxy({ allowedPorts = config.allowedPorts, onBlocked } = {}) {
  const dnsCache = new Map()
  const openSockets = new Set()
  const blockedLog = []

  const recordBlock = (hostname, port, code, message) => {
    const entry = { hostname: String(hostname || '').slice(0, 253), port, code, at: new Date().toISOString() }
    blockedLog.push(entry)
    try {
      onBlocked?.(entry)
    } catch {
      /* logging must never break the proxy */
    }
  }

  const guard = async (hostname, port, scheme = 'https:') => {
    const normalized = normalizeHostname(hostname)
    const targetUrl = `${scheme}//${formatAuthorityHost(normalized)}:${port}/`
    return validateTargetUrl(targetUrl, { allowedPorts, dnsCache })
  }

  const trackSocket = (socket) => {
    openSockets.add(socket)
    socket.once('close', () => openSockets.delete(socket))
    socket.on('error', () => {})
  }

  const server = http.createServer((req, res) => {
    // Plain HTTP requests arrive in absolute-URI form.
    if (req.method === 'CONNECT') {
      respondPlain(res, 405, 'Method Not Allowed')
      return
    }

    let target
    try {
      target = new URL(req.url)
    } catch {
      respondPlain(res, 400, 'Bad Request')
      recordBlock('', 0, 'INVALID_TARGET', 'Proxy request did not contain an absolute URL')
      return
    }

    if (target.protocol !== 'http:') {
      respondPlain(res, 403, 'Forbidden')
      recordBlock(target.hostname, Number(target.port || 80), 'UNSUPPORTED_PROTOCOL', 'Proxy only forwards HTTP')
      return
    }

    const port = Number(target.port || 80)
    guard(target.hostname, port, 'http:')
      .then((validated) => {
        const headers = {}
        for (const [key, value] of Object.entries(req.headers)) {
          if (HOP_BY_HOP_HEADERS.has(key)) continue
          headers[key] = value
        }
        headers.host = target.host

        const agent = new http.Agent({
          lookup: createPinnedLookup(validated.addresses),
          keepAlive: false,
          maxSockets: 1,
        })

        const upstream = http.request(
          {
            hostname: validated.hostname,
            port: validated.port,
            path: `${target.pathname}${target.search}`,
            method: req.method,
            headers,
            agent,
            timeout: 20000,
          },
          (upstreamResponse) => {
            const responseHeaders = {}
            for (const [key, value] of Object.entries(upstreamResponse.headers)) {
              if (HOP_BY_HOP_HEADERS.has(key)) continue
              responseHeaders[key] = value
            }
            responseHeaders.connection = 'close'
            res.writeHead(upstreamResponse.statusCode || 502, responseHeaders)
            upstreamResponse.pipe(res)
            upstreamResponse.on('end', () => agent.destroy())
          },
        )

        upstream.on('timeout', () => upstream.destroy(new Error('Proxy upstream timeout')))
        upstream.on('error', () => {
          agent.destroy()
          respondPlain(res, 502, 'Bad Gateway')
        })
        req.on('aborted', () => upstream.destroy())
        req.pipe(upstream)
      })
      .catch((error) => {
        const policy = isPolicyError(error)
        respondPlain(res, policy ? 403 : 502, policy ? 'Forbidden' : 'Bad Gateway')
        if (policy) recordBlock(target.hostname, port, error?.code || 'TARGET_NOT_ALLOWED', 'Blocked by proxy policy')
      })
  })

  server.on('connect', (req, clientSocket, head) => {
    trackSocket(clientSocket)

    let target
    try {
      target = splitAuthority(req.url, 443)
    } catch {
      respondSocket(clientSocket, '400 Bad Request', 'Bad Request')
      recordBlock('', 0, 'INVALID_TARGET', 'Malformed CONNECT authority')
      return
    }

    const port = target.port
    guard(target.hostname, port, 'https:')
      .then(async (validated) => {
        const upstream = await connectPinned(validated.addresses, port)

        if (clientSocket.destroyed) {
          upstream.destroy()
          return
        }

        clientSocket.write('HTTP/1.1 200 Connection Established\r\nProxy-Agent: SiteScanner-EgressGuard\r\n\r\n')
        if (head?.length) upstream.write(head)

        upstream.on('error', () => clientSocket.destroy())
        clientSocket.on('error', () => upstream.destroy())
        clientSocket.once('close', () => upstream.destroy())
        upstream.once('close', () => clientSocket.destroy())

        upstream.pipe(clientSocket)
        clientSocket.pipe(upstream)
      })
      .catch((error) => {
        const policy = isPolicyError(error)
        if (policy) {
          recordBlock(target.hostname, port, error?.code || 'TARGET_NOT_ALLOWED', 'Blocked by proxy policy')
        }
        if (!clientSocket.destroyed) {
          respondSocket(clientSocket, policy ? '403 Forbidden' : '502 Bad Gateway', policy ? 'Forbidden' : 'Bad Gateway')
        }
      })

    clientSocket.on('error', () => {})
  })

  // Any protocol upgrade (plain WebSocket) is denied. WebSockets are also
  // explicitly blocked in the browser context for the same reason.
  server.on('upgrade', (req, socket) => {
    respondSocket(socket, '403 Forbidden', 'Forbidden')
    recordBlock('', 0, 'UPGRADE_BLOCKED', 'Protocol upgrades are not allowed during scans')
  })

  server.on('clientError', (_error, socket) => {
    if (socket.writable) respondSocket(socket, '400 Bad Request', 'Bad Request')
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })

  const { port } = server.address()

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    server,
    blockedLog,
    async close() {
      for (const socket of openSockets) {
        try {
          socket.destroy()
        } catch {
          /* noop */
        }
      }
      openSockets.clear()
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections()
      await new Promise((resolve) => server.close(() => resolve()))
    },
  }
}
