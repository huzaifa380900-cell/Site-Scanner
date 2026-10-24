import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { resolveAll } from '../src/security/dns.js'

vi.mock('../src/security/dns.js', () => ({
  resolveAll: vi.fn(),
}))

vi.mock('../src/config/database.js', () => ({
  isDatabaseConnected: vi.fn(() => true),
  getDatabaseStatus: vi.fn(() => 'connected'),
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}))

vi.mock('../src/models/ScanReport.js', () => ({
  ScanReport: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { createApp } from '../src/app.js'
import { ScanReport } from '../src/models/ScanReport.js'

const app = createApp()

function listChain(items) {
  const lean = vi.fn().mockResolvedValue(items)
  const select = vi.fn(() => ({ lean }))
  const limit = vi.fn(() => ({ select }))
  const skip = vi.fn(() => ({ limit }))
  const sort = vi.fn(() => ({ skip }))
  ScanReport.find.mockReturnValue({ sort })
  ScanReport.countDocuments.mockResolvedValue(items.length)
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveAll.mockReset()
  resolveAll.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
})

describe('GET /api/health', () => {
  it('reports API and database state without secrets', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.database.connected).toBe(true)
    expect(response.body.data.service).toBe('Site Scanner API')
    expect(JSON.stringify(response.body)).not.toMatch(/mongodb\+srv|MONGODB_URI|password/i)
  })
})

describe('POST /api/scans — SSRF enforcement at the API boundary', () => {
  it.each([
    ['http://localhost', 'BLOCKED_HOSTNAME'],
    ['http://127.0.0.1', 'PROHIBITED_ADDRESS'],
    ['http://192.168.1.1', 'PROHIBITED_ADDRESS'],
    ['http://10.0.0.1', 'PROHIBITED_ADDRESS'],
    ['http://172.16.0.1', 'PROHIBITED_ADDRESS'],
    ['http://169.254.169.254/latest/meta-data/', 'PROHIBITED_ADDRESS'],
    ['http://metadata.google.internal/', 'BLOCKED_HOSTNAME'],
    ['http://[::1]/', 'PROHIBITED_ADDRESS'],
    ['http://[fd12::1]/', 'PROHIBITED_ADDRESS'],
    ['file:///etc/passwd', 'UNSUPPORTED_PROTOCOL'],
    ['http://user:pass@example.com', 'CREDENTIALS_NOT_ALLOWED'],
  ])('rejects %s with %s and never persists a report', async (url, code) => {
    const response = await request(app).post('/api/scans').send({ url })
    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe(code)
    expect(ScanReport.create).not.toHaveBeenCalled()
  })

  it('does not leak the blocked internal address in the response', async () => {
    const response = await request(app).post('/api/scans').send({ url: 'http://169.254.169.254/' })
    expect(JSON.stringify(response.body)).not.toContain('169.254.169.254')
    expect(response.body.error.message).toMatch(/not allowed/i)
  })

  it('rejects a public-looking hostname that resolves to a private address', async () => {
    resolveAll.mockResolvedValue([{ address: '10.0.0.7', family: 4 }])
    const response = await request(app).post('/api/scans').send({ url: 'https://internal.example.test' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('PROHIBITED_ADDRESS')
    expect(ScanReport.create).not.toHaveBeenCalled()
  })

  it('rejects hostnames with mixed public and private answers', async () => {
    resolveAll.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    const response = await request(app).post('/api/scans').send({ url: 'https://mixed.example.test' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('PROHIBITED_ADDRESS')
  })

  it('rejects malformed JSON with a JSON error', async () => {
    const response = await request(app)
      .post('/api/scans')
      .set('Content-Type', 'application/json')
      .send('{"url": ')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_JSON')
  })

  it('rejects a missing URL with validation details', async () => {
    const response = await request(app).post('/api/scans').send({})
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details).toBeTruthy()
  })

  it('rejects unknown body fields', async () => {
    const response = await request(app).post('/api/scans').send({ url: 'https://example.com', extra: true })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an unparseable URL', async () => {
    const response = await request(app).post('/api/scans').send({ url: 'not a real url' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_URL')
  })

  it('rejects an origin that is not in the CORS allowlist', async () => {
    const response = await request(app)
      .post('/api/scans')
      .set('Origin', 'https://evil.example')
      .send({ url: 'https://example.com' })
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('CORS_NOT_ALLOWED')
  })
})

describe('GET /api/scans', () => {
  it('returns a bounded, paginated list', async () => {
    listChain([])
    const response = await request(app).get('/api/scans?page=1&limit=5')
    expect(response.status).toBe(200)
    expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 5, total: 0 })
    expect(Array.isArray(response.body.data.items)).toBe(true)
  })

  it('rejects an excessive limit', async () => {
    const response = await request(app).get('/api/scans?limit=500')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a non-numeric page', async () => {
    const response = await request(app).get('/api/scans?page=abc')
    expect(response.status).toBe(400)
  })

  it('rejects an invalid object id', async () => {
    const response = await request(app).get('/api/scans/not-an-object-id')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_ID')
  })

  it('returns 404 for a well-formed but missing id', async () => {
    ScanReport.findById.mockResolvedValue(null)
    const response = await request(app).get('/api/scans/0123456789abcdef01234567')
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})
