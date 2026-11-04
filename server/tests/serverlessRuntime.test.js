import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Regression tests for the two Vercel deployment failures:
 *
 * 1. Chromium never started on Vercel because @sparticuz/chromium only
 *    inflates its shared libraries when it detects an AWS Lambda environment
 *    (Vercel does not look like Lambda to the package).
 * 2. Express aborted every request with ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
 *    because `trust proxy` stayed disabled behind Vercel's edge proxy.
 */

// The application module is re-imported with fresh module state in these
// tests, so the database and the Mongoose model are stubbed out.
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

const ENV_KEYS = [
  'VERCEL',
  'VERCEL_ENV',
  'RENDER',
  'RENDER_SERVICE_ID',
  'TRUST_PROXY',
  'CLIENT_ORIGIN',
  'AWS_EXECUTION_ENV',
  'AWS_LAMBDA_JS_RUNTIME',
]

const originalEnv = {}
for (const key of ENV_KEYS) originalEnv[key] = process.env[key]

function resetEnv() {
  for (const key of ENV_KEYS) delete process.env[key]
}

afterEach(() => {
  resetEnv()
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  vi.resetModules()
})

describe('trust proxy configuration', () => {
  it('trusts exactly one Render proxy hop by default', async () => {
    resetEnv()
    process.env.RENDER = 'true'
    vi.resetModules()

    const { createApp } = await import('../src/app.js')
    const app = createApp()

    expect(app.get('trust proxy')).toBe(1)
  })

  it(
    'trusts exactly one proxy hop on Vercel without any environment variable',
    async () => {
      resetEnv()
      process.env.VERCEL = '1'
      vi.resetModules()

      const { createApp } = await import('../src/app.js')
      const app = createApp()

      expect(app.get('trust proxy')).toBe(1)
    },
    20000,
  )

  it(
    'keeps trust proxy disabled when no proxy is in front of the app',
    async () => {
      resetEnv()
      vi.resetModules()

      const { createApp } = await import('../src/app.js')
      const app = createApp()

      expect(app.get('trust proxy')).toBe(false)
    },
    20000,
  )

  it(
    'honours an explicit TRUST_PROXY=false override on Vercel',
    async () => {
      resetEnv()
      process.env.VERCEL = '1'
      process.env.TRUST_PROXY = 'false'
      vi.resetModules()

      const { createApp } = await import('../src/app.js')
      const app = createApp()

      expect(app.get('trust proxy')).toBe(false)
    },
    20000,
  )

  it(
    'enables trust proxy from TRUST_PROXY=true outside Vercel',
    async () => {
      resetEnv()
      process.env.TRUST_PROXY = 'true'
      vi.resetModules()

      const { createApp } = await import('../src/app.js')
      const app = createApp()

      expect(app.get('trust proxy')).toBe(1)
    },
    20000,
  )
})

describe('Render production CORS configuration', () => {
  it('allows the exact Vercel frontend origin configured in CLIENT_ORIGIN', async () => {
    resetEnv()
    process.env.RENDER = 'true'
    process.env.CLIENT_ORIGIN = 'https://site-scanner.vercel.app'
    vi.resetModules()

    const { createApp } = await import('../src/app.js')
    const response = await request(createApp())
      .options('/api/health')
      .set('Origin', 'https://site-scanner.vercel.app')
      .set('Access-Control-Request-Method', 'GET')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('https://site-scanner.vercel.app')
  })
})

describe('serverless Chromium runtime detection', () => {
  it('detects the Vercel runtime', async () => {
    resetEnv()
    process.env.VERCEL = '1'
    vi.resetModules()

    const { isServerlessRuntime, describeRuntime } = await import('../src/scanners/chromiumRuntime.js')

    expect(isServerlessRuntime()).toBe(true)
    expect(describeRuntime().host).toBe('vercel')
  })

  it('uses the Playwright-installed Chromium on Render instead of Sparticuz', async () => {
    resetEnv()
    process.env.RENDER = 'true'
    vi.resetModules()

    const executablePath = path.join(os.tmpdir(), `render-chromium-${process.pid}`)
    fs.writeFileSync(executablePath, '')
    const { chromium } = await import('playwright-core')
    const executablePathSpy = vi.spyOn(chromium, 'executablePath').mockReturnValue(executablePath)

    try {
      const { resolveChromiumConfig } = await import('../src/scanners/browserScanner.js')
      const resolved = await resolveChromiumConfig('http://127.0.0.1:12345')

      expect(resolved.executablePath).toBe(executablePath)
      expect(resolved.diagnostics.source).toBe('playwright-installed')
      expect(resolved.diagnostics.binaryPresent).toBe(true)
      expect(executablePathSpy).toHaveBeenCalledOnce()
    } finally {
      executablePathSpy.mockRestore()
      fs.rmSync(executablePath, { force: true })
    }
  })

  it('does not treat a local machine as serverless', async () => {
    resetEnv()
    vi.resetModules()

    const { isServerlessRuntime, describeRuntime } = await import('../src/scanners/chromiumRuntime.js')

    expect(isServerlessRuntime()).toBe(false)
    expect(describeRuntime().host).toBe('local')
  })

  it('never changes the environment on a non-serverless machine', async () => {
    resetEnv()
    vi.resetModules()

    const { prepareServerlessEnvironment } = await import('../src/scanners/chromiumRuntime.js')
    const before = { ...process.env }
    const report = prepareServerlessEnvironment()

    expect(report.applied).toBe(false)
    expect(process.env.LD_LIBRARY_PATH).toBe(before.LD_LIBRARY_PATH)
    expect(process.env.FONTCONFIG_PATH).toBe(before.FONTCONFIG_PATH)
  })
})

describe('tar extraction used for the Chromium runtime libraries', () => {
  function buildTar(entries) {
    const blocks = []
    for (const entry of entries) {
      const header = Buffer.alloc(512)
      header.write(entry.name, 0, 100, 'utf8')
      header.write('0000644\0', 100, 8, 'ascii')
      header.write('0000000\0', 108, 8, 'ascii')
      header.write('0000000\0', 116, 8, 'ascii')
      header.write(`${entry.size.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii')
      header.write('00000000000\0', 136, 12, 'ascii')
      header.write('        ', 148, 8, 'ascii')
      header.write(entry.type || '0', 156, 1, 'ascii')
      if (entry.linkName) header.write(entry.linkName, 157, 100, 'utf8')
      header.write('ustar\0', 257, 6, 'ascii')
      let checksum = 0
      for (const byte of header) checksum += byte
      header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')
      blocks.push(header)
      const data = Buffer.alloc(Math.ceil(entry.size / 512) * 512)
      entry.content?.copy(data, 0)
      blocks.push(data)
    }
    blocks.push(Buffer.alloc(1024))
    return Buffer.concat(blocks)
  }

  it('writes regular files and creates directories', async () => {
    resetEnv()
    vi.resetModules()
    const { extractTarArchive } = await import('../src/scanners/chromiumRuntime.js')

    const archive = buildTar([
      { name: 'lib/', type: '5', size: 0 },
      { name: 'lib/libnss3.so', size: 5, content: Buffer.from('hello') },
    ])

    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-tar-'))
    try {
      const written = extractTarArchive(archive, destination)
      expect(written).toBe(1)
      expect(fs.existsSync(path.join(destination, 'lib', 'libnss3.so'))).toBe(true)
      expect(fs.readFileSync(path.join(destination, 'lib', 'libnss3.so'), 'utf8')).toBe('hello')
    } finally {
      fs.rmSync(destination, { recursive: true, force: true })
    }
  })

  it('creates relative symlinks from the tar header linkname', async () => {
    resetEnv()
    vi.resetModules()
    const { extractTarArchive } = await import('../src/scanners/chromiumRuntime.js')

    const archive = buildTar([
      { name: 'lib/aliases/libalias.so', type: '2', size: 0, linkName: '../libnss3.so' },
      { name: 'lib/libnss3.so', size: 5, content: Buffer.from('hello') },
    ])
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-tar-link-'))
    try {
      extractTarArchive(archive, destination)
      const link = path.join(destination, 'lib', 'aliases', 'libalias.so')
      expect(fs.readlinkSync(link)).toBe('../libnss3.so')
      expect(fs.readFileSync(link, 'utf8')).toBe('hello')
    } catch (error) {
      if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error
    } finally {
      fs.rmSync(destination, { recursive: true, force: true })
    }
  })

  it('creates hard links, including links declared before their target', async () => {
    resetEnv()
    vi.resetModules()
    const { extractTarArchive } = await import('../src/scanners/chromiumRuntime.js')

    const archive = buildTar([
      { name: 'lib/libalias.so', type: '1', size: 0, linkName: 'lib/libnss3.so' },
      { name: 'lib/libnss3.so', size: 5, content: Buffer.from('hello') },
    ])
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-tar-hardlink-'))
    try {
      extractTarArchive(archive, destination)
      const alias = path.join(destination, 'lib', 'libalias.so')
      const source = path.join(destination, 'lib', 'libnss3.so')
      expect(fs.readFileSync(alias, 'utf8')).toBe('hello')
      fs.writeFileSync(source, 'world')
      expect(fs.readFileSync(alias, 'utf8')).toBe('world')
    } finally {
      fs.rmSync(destination, { recursive: true, force: true })
    }
  })

  it('propagates symlink creation failures', async () => {
    resetEnv()
    vi.resetModules()
    const { extractTarArchive } = await import('../src/scanners/chromiumRuntime.js')
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-tar-link-error-'))
    const symlink = vi.spyOn(fs, 'symlinkSync').mockImplementation(() => {
      throw Object.assign(new Error('symlink denied'), { code: 'EPERM' })
    })

    try {
      const archive = buildTar([{ name: 'lib/libalias.so', type: '2', size: 0, linkName: 'libnss3.so' }])
      expect(() => extractTarArchive(archive, destination)).toThrow('symlink denied')
    } finally {
      symlink.mockRestore()
      fs.rmSync(destination, { recursive: true, force: true })
    }
  })

  it('rejects symlink targets that escape the extraction directory', async () => {
    resetEnv()
    vi.resetModules()
    const { extractTarArchive } = await import('../src/scanners/chromiumRuntime.js')
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-tar-link-traversal-'))

    try {
      const archive = buildTar([{ name: 'lib/libalias.so', type: '2', size: 0, linkName: '../../outside' }])
      expect(() => extractTarArchive(archive, destination)).toThrow(/escapes extraction directory/)
    } finally {
      fs.rmSync(destination, { recursive: true, force: true })
    }
  })

  it.each(['../escape', '/outside', 'C:\\outside'])('rejects tar path traversal: %s', async (name) => {
    resetEnv()
    vi.resetModules()
    const { extractTarArchive } = await import('../src/scanners/chromiumRuntime.js')

    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-tar-traversal-'))
    const destination = path.join(base, 'extract')
    try {
      expect(() => extractTarArchive(buildTar([{ name, size: 5, content: Buffer.from('hello') }]), destination)).toThrow(
        /Invalid tar path|escapes extraction directory/,
      )
      expect(fs.existsSync(path.join(base, 'escape'))).toBe(false)
      expect(fs.existsSync(path.join(base, 'outside'))).toBe(false)
    } finally {
      fs.rmSync(base, { recursive: true, force: true })
    }
  })

  it('rejects extraction when required Chromium libraries are missing or unreadable', async () => {
    resetEnv()
    vi.resetModules()
    const { verifyRequiredLibraries } = await import('../src/scanners/chromiumRuntime.js')
    const libraryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-required-libs-'))

    try {
      expect(() => verifyRequiredLibraries(libraryDir)).toThrow(/libnss3\.so.*libnspr4\.so.*libexpat\.so\.1/)
    } finally {
      fs.rmSync(libraryDir, { recursive: true, force: true })
    }
  })
})

describe('Chromium launch arguments', () => {
  it('drops the flags that would weaken the browser security model', async () => {
    resetEnv()
    vi.resetModules()

    const { filterChromiumArgs } = await import('../src/scanners/browserScanner.js')
    const filtered = filterChromiumArgs([
      '--no-sandbox',
      '--disable-web-security',
      '--allow-running-insecure-content',
      "--headless='shell'",
      '--use-angle=swiftshader',
    ])

    expect(filtered).toEqual(['--no-sandbox'])
  })

  it('keeps the sandbox and proxy hardening flags', async () => {
    resetEnv()
    vi.resetModules()

    const { filterChromiumArgs } = await import('../src/scanners/browserScanner.js')
    const filtered = filterChromiumArgs([
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
    ])

    expect(filtered).toContain('--no-sandbox')
    expect(filtered).toContain('--disable-setuid-sandbox')
    expect(filtered).toContain('--disable-dev-shm-usage')
  })
})
