import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import net from 'node:net'
import { resolveAll } from '../src/security/dns.js'

vi.mock('../src/security/dns.js', () => ({
  resolveAll: vi.fn(),
}))

import { startEgressProxy } from '../src/security/egressProxy.js'

const openServers = []

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function rawRequest(port, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let settled = false
    const finish = (fn, value) => {
      if (settled) return
      settled = true
      fn(value)
    }

    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(payload)
    })
    socket.setEncoding('latin1')
    socket.setTimeout(timeoutMs, () => {
      socket.destroy()
      finish(reject, new Error('proxy response timed out'))
    })
    socket.on('data', (chunk) => chunks.push(chunk))
    socket.on('error', (error) => finish(reject, error))
    socket.on('close', () => finish(resolve, chunks.join('')))
  })
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  openServers.push(server)
  return server.address().port
}

beforeEach(() => {
  resolveAll.mockReset()
  resolveAll.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
})

afterEach(async () => {
  for (const server of openServers.splice(0)) {
    await new Promise((resolve) => server.close(() => resolve()))
  }
})

describe('egress proxy enforcement (actual network boundary)', () => {
  it('refuses CONNECT to IPv4 loopback', async () => {
    const proxy = await startEgressProxy()
    try {
      const response = await rawRequest(
        proxy.port,
        'CONNECT 127.0.0.1:443 HTTP/1.1\r\nHost: 127.0.0.1:443\r\n\r\n',
      )
      expect(response).toMatch(/403 Forbidden/)
      expect(proxy.blockedLog.some((entry) => entry.code === 'PROHIBITED_ADDRESS')).toBe(true)
    } finally {
      await proxy.close()
    }
  })

  it('refuses CONNECT to the cloud metadata address', async () => {
    const proxy = await startEgressProxy()
    try {
      const response = await rawRequest(
        proxy.port,
        'CONNECT 169.254.169.254:443 HTTP/1.1\r\nHost: 169.254.169.254:443\r\n\r\n',
      )
      expect(response).toMatch(/403 Forbidden/)
    } finally {
      await proxy.close()
    }
  })

  it('refuses CONNECT to IPv6 loopback and unique-local addresses', async () => {
    const proxy = await startEgressProxy()
    try {
      for (const authority of ['[::1]:443', '[fd00::1]:443', '[fe80::1]:443']) {
        const response = await rawRequest(
          proxy.port,
          `CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`,
        )
        expect(response).toMatch(/403 Forbidden/)
      }
    } finally {
      await proxy.close()
    }
  })

  it('refuses plain HTTP proxying to a private IP', async () => {
    const proxy = await startEgressProxy()
    try {
      const response = await rawRequest(
        proxy.port,
        'GET http://192.168.1.1/ HTTP/1.1\r\nHost: 192.168.1.1\r\nConnection: close\r\n\r\n',
      )
      expect(response).toMatch(/403 Forbidden/)
    } finally {
      await proxy.close()
    }
  })

  it('refuses protocol upgrades', async () => {
    const proxy = await startEgressProxy()
    try {
      const response = await rawRequest(
        proxy.port,
        'GET http://example.com/socket HTTP/1.1\r\nHost: example.com\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
      )
      expect(response).toMatch(/403 Forbidden/)
    } finally {
      await proxy.close()
    }
  })

  it('never connects when a hostname resolves to a private address', async () => {
    let connectionCount = 0
    const listener = net.createServer((socket) => {
      connectionCount += 1
      socket.destroy()
    })
    const targetPort = await listen(listener)

    resolveAll.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    const proxy = await startEgressProxy({ allowedPorts: new Set([targetPort, 443]) })
    try {
      const response = await rawRequest(
        proxy.port,
        `CONNECT internal.example.test:${targetPort} HTTP/1.1\r\nHost: internal.example.test:${targetPort}\r\n\r\n`,
      )
      expect(response).toMatch(/403 Forbidden/)
      await delay(250)
      expect(connectionCount).toBe(0)
    } finally {
      await proxy.close()
    }
  })

  it('rejects a CONNECT to a private IP even when the port is allowlisted', async () => {
    let connectionCount = 0
    const listener = net.createServer((socket) => {
      connectionCount += 1
      socket.destroy()
    })
    const targetPort = await listen(listener)

    const proxy = await startEgressProxy({ allowedPorts: new Set([targetPort]) })
    try {
      const response = await rawRequest(
        proxy.port,
        `CONNECT 127.0.0.1:${targetPort} HTTP/1.1\r\nHost: 127.0.0.1:${targetPort}\r\n\r\n`,
      )
      expect(response).toMatch(/403 Forbidden/)
      await delay(250)
      expect(connectionCount).toBe(0)
    } finally {
      await proxy.close()
    }
  })

  it('refuses ports that are not on the allowlist before any connection', async () => {
    const proxy = await startEgressProxy({ allowedPorts: new Set([80, 443]) })
    try {
      const response = await rawRequest(
        proxy.port,
        'CONNECT example.com:22 HTTP/1.1\r\nHost: example.com:22\r\n\r\n',
      )
      expect(response).toMatch(/403 Forbidden/)
      expect(proxy.blockedLog.some((entry) => entry.code === 'PORT_NOT_ALLOWED')).toBe(true)
    } finally {
      await proxy.close()
    }
  })
})
