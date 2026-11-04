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
    findOne: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

import { createApp } from '../src/app.js'
import { ScanReport } from '../src/models/ScanReport.js'

const app = createApp()
const ownerId = '123e4567-e89b-42d3-a456-426614174000'

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
    const response = await request(app).post('/api/scans').set('X-Scanner-Owner', ownerId).send({ url })
    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe(code)
    expect(ScanReport.create).not.toHaveBeenCalled()
  })

  it('does not leak the blocked internal address in the response', async () => {
    const response = await request(app)
      .post('/api/scans')
      .set('X-Scanner-Owner', ownerId)
      .send({ url: 'http://169.254.169.254/' })
    expect(JSON.stringify(response.body)).not.toContain('169.254.169.254')
    expect(response.body.error.message).toMatch(/not allowed/i)
  })

  it('rejects a public-looking hostname that resolves to a private address', async () => {
    resolveAll.mockResolvedValue([{ address: '10.0.0.7', family: 4 }])
    const response = await request(app)
      .post('/api/scans')
      .set('X-Scanner-Owner', ownerId)
      .send({ url: 'https://internal.example.test' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('PROHIBITED_ADDRESS')
    expect(ScanReport.create).not.toHaveBeenCalled()
  })

  it('rejects hostnames with mixed public and private answers', async () => {
    resolveAll.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    const response = await request(app)
      .post('/api/scans')
      .set('X-Scanner-Owner', ownerId)
      .send({ url: 'https://mixed.example.test' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('PROHIBITED_ADDRESS')
  })

  it('rejects malformed JSON with a JSON error', async () => {
    const response = await request(app)
      .post('/api/scans')
      .set('X-Scanner-Owner', ownerId)
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
    const response = await request(app)
      .post('/api/scans')
      .set('X-Scanner-Owner', ownerId)
      .send({ url: 'https://example.com', extra: true })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an unparseable URL', async () => {
    const response = await request(app).post('/api/scans').set('X-Scanner-Owner', ownerId).send({ url: 'not a real url' })
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
    const response = await request(app).get('/api/scans?page=1&limit=5').set('X-Scanner-Owner', ownerId)
    expect(response.status).toBe(200)
    expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 5, total: 0 })
    expect(Array.isArray(response.body.data.items)).toBe(true)
    expect(ScanReport.find).toHaveBeenCalledWith({ ownerHash: expect.stringMatching(/^[a-f0-9]{64}$/) })
  })

  it('requires a browser history identifier', async () => {
    const response = await request(app).get('/api/scans')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('OWNER_REQUIRED')
  })

  it('rejects an excessive limit', async () => {
    const response = await request(app).get('/api/scans?limit=500').set('X-Scanner-Owner', ownerId)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a non-numeric page', async () => {
    const response = await request(app).get('/api/scans?page=abc').set('X-Scanner-Owner', ownerId)
    expect(response.status).toBe(400)
  })

  it('rejects an invalid object id', async () => {
    const response = await request(app).get('/api/scans/not-an-object-id').set('X-Scanner-Owner', ownerId)
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_ID')
  })

  it('returns 404 for a well-formed but missing id', async () => {
    ScanReport.findOne.mockResolvedValue(null)
    const response = await request(app)
      .get('/api/scans/0123456789abcdef01234567')
      .set('X-Scanner-Owner', ownerId)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
    expect(ScanReport.findOne).toHaveBeenCalledWith({
      _id: '0123456789abcdef01234567',
      ownerHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })
})

describe('DELETE /api/scans/:id', () => {
  it('deletes only a report owned by this browser identifier', async () => {
    ScanReport.deleteOne.mockResolvedValue({ deletedCount: 1 })
    const response = await request(app)
      .delete('/api/scans/0123456789abcdef01234567')
      .set('X-Scanner-Owner', ownerId)
    expect(response.status).toBe(200)
    expect(response.body.data.deleted).toBe(true)
    expect(ScanReport.deleteOne).toHaveBeenCalledWith({
      _id: '0123456789abcdef01234567',
      ownerHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })

  it('does not delete a report that belongs to another browser', async () => {
    ScanReport.deleteOne.mockResolvedValue({ deletedCount: 0 })
    const response = await request(app)
      .delete('/api/scans/0123456789abcdef01234567')
      .set('X-Scanner-Owner', ownerId)
    expect(response.status).toBe(404)
    expect(ScanReport.deleteOne).toHaveBeenCalledWith({
      _id: '0123456789abcdef01234567',
      ownerHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })

  it('rejects a delete without the browser identifier', async () => {
    const response = await request(app).delete('/api/scans/0123456789abcdef01234567')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('OWNER_REQUIRED')
  })
})
