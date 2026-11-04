import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import chromium from '@sparticuz/chromium'

/**
 * Serverless Chromium bootstrap for @sparticuz/chromium.
 *
 * Why this module exists
 * ----------------------
 * @sparticuz/chromium ships the shared libraries that Chromium needs
 * (libnss3, libnspr4, libexpat, ...) as `al2.tar.br` / `al2023.tar.br`.
 * The package only inflates them and only sets `LD_LIBRARY_PATH` when it
 * detects an *AWS Lambda* environment (it looks at AWS_EXECUTION_ENV,
 * AWS_LAMBDA_JS_RUNTIME and CODEBUILD_BUILD_IMAGE).
 *
 * Vercel serverless functions also run on Amazon Linux 2023, but Vercel does
 * not set any of those variables. The result was that the library archive was
 * never inflated, `LD_LIBRARY_PATH` was never populated and Chromium died on
 * startup with `error while loading shared libraries: libnss3.so`. Playwright
 * reports that as a generic launch failure, which is why every browser scan
 * ended with "the Chromium browser is not available on the server".
 *
 * This module performs the missing steps explicitly:
 *   1. detect the serverless runtime and the Linux flavour,
 *   2. inflate the matching library archive into /tmp,
 *   3. export LD_LIBRARY_PATH / FONTCONFIG_PATH / HOME / TMPDIR for the
 *      browser process,
 *   4. resolve the Chromium executable and return a safe launch environment.
 *
 * No secrets are read, logged or forwarded to the browser process.
 */

const require = createRequire(import.meta.url)

/** True on Vercel, AWS Lambda and other Lambda-style serverless runtimes. */
export function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_VERSION ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.AWS_LAMBDA_JS_RUNTIME ||
      process.env.LAMBDA_TASK_ROOT,
  )
}

/** Human readable runtime description used in (secret-free) log lines. */
export function describeRuntime() {
  const host = process.env.VERCEL
    ? 'vercel'
    : process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_JS_RUNTIME
      ? 'aws-lambda'
      : 'local'
  return {
    host,
    platform: process.platform,
    node: process.versions.node,
    serverless: isServerlessRuntime(),
  }
}

/** Locate the `bin` folder that ships the compressed Chromium payload. */
function getSparticuzBinDir() {
  // Resolve the package entry point instead of package.json so the lookup only
  // depends on files that are part of the deployed function bundle.
  const entry = require.resolve('@sparticuz/chromium')
  return path.join(path.dirname(entry), '..', 'bin')
}

/** Read /etc/os-release without exposing anything sensitive. */
function readOsRelease() {
  try {
    const raw = fs.readFileSync('/etc/os-release', 'utf8')
    const fields = {}
    for (const line of raw.split('\n')) {
      const separator = line.indexOf('=')
      if (separator === -1) continue
      const key = line.slice(0, separator).trim()
      const value = line.slice(separator + 1).trim().replace(/^"|"$/g, '')
      fields[key] = value
    }
    return fields
  } catch {
    return {}
  }
}

/**
 * Choose which library archive matches the host.
 * AL2023 (`al2023.tar.br`) is used for every modern runtime, including Vercel.
 */
function chooseLibraryPack() {
  const release = readOsRelease()
  const descriptor = `${release.VERSION_ID || ''} ${release.PRETTY_NAME || ''} ${release.ID || ''}`
  if (/2023/i.test(descriptor)) return 'al2023'
  if (/amazon\s*linux\s*2/i.test(descriptor)) return 'al2'
  if (process.env.AWS_EXECUTION_ENV && /2[02]\.x/.test(process.env.AWS_EXECUTION_ENV)) return 'al2023'
  if (process.env.AWS_LAMBDA_JS_RUNTIME && /2[02]\.x/.test(process.env.AWS_LAMBDA_JS_RUNTIME)) return 'al2023'
  // Vercel (and any other AL2023 based provider) always uses the AL2023 pack.
  return 'al2023'
}

/**
 * Minimal, dependency-free tar extractor.
 * The Sparticuz archives only contain regular files and directories.
 */
export function extractTarArchive(archive, destination) {
  let offset = 0
  let written = 0

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512)
    const name = header.toString('utf8', 0, 100).replace(/\0[\s\S]*$/, '')
    if (!name) break

    const prefix = header.toString('utf8', 345, 500).replace(/\0[\s\S]*$/, '')
    const sizeField = header.toString('ascii', 124, 136).replace(/\0[\s\S]*$/, '').trim()
    const size = sizeField ? Number.parseInt(sizeField, 8) : 0
    const type = String.fromCharCode(header[156] || 0)

    offset += 512
    const data = archive.subarray(offset, offset + size)
    offset += Math.ceil(size / 512) * 512

    const relativeName = prefix ? path.posix.join(prefix, name) : name
    const target = path.join(destination, relativeName)

    if (type === '5') {
      fs.mkdirSync(target, { recursive: true })
      continue
    }
    if (type === '2') {
      // Symlink: store the link target instead of the (absent) content.
      const linkTarget = data.toString('utf8').replace(/\0[\s\S]*$/, '')
      try {
        fs.mkdirSync(path.dirname(target), { recursive: true })
        if (!fs.existsSync(target)) fs.symlinkSync(linkTarget, target)
        written += 1
      } catch {
        /* a broken optional symlink must never break the bootstrap */
      }
      continue
    }
    if (type !== '0' && type !== '\0' && type !== '' && type !== '7') continue

    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, data)
    try {
      fs.chmodSync(target, 0o755)
    } catch {
      /* best effort */
    }
    written += 1
  }

  return written
}

/**
 * Inflate the shared-library archive for the detected Linux flavour.
 * Idempotent: a marker file prevents re-extraction on warm invocations.
 */
function extractLibraryPack(pack) {
  const binDir = getSparticuzBinDir()
  const source = path.join(binDir, `${pack}.tar.br`)
  const destination = path.join(os.tmpdir(), pack)
  const marker = path.join(destination, '.extracted')

  if (fs.existsSync(marker)) return { ok: true, destination, alreadyPresent: true }
  if (!fs.existsSync(source)) return { ok: false, destination, reason: 'archive-missing' }

  fs.mkdirSync(destination, { recursive: true })
  const archive = zlib.brotliDecompressSync(fs.readFileSync(source))
  const written = extractTarArchive(archive, destination)
  fs.writeFileSync(marker, `ok:${written}`)

  return { ok: true, destination, alreadyPresent: false, files: written }
}

/**
 * Prepare the process environment for a serverless Chromium launch.
 * Safe to call on every invocation; it is a no-op outside serverless Linux.
 */
export function prepareServerlessEnvironment() {
  const report = { applied: false, libraries: null, libraryPath: null }

  if (process.platform !== 'linux' || !isServerlessRuntime()) return report

  // Chromium needs a writable HOME (Lambda sets HOME=/root, which is not
  // writable) and a writable temporary directory.
  process.env.HOME = os.tmpdir()
  process.env.TMPDIR = process.env.TMPDIR || os.tmpdir()

  const primary = chooseLibraryPack()
  const secondary = primary === 'al2023' ? 'al2' : 'al2023'
  let pack = primary

  if (!fs.existsSync(path.join(os.tmpdir(), primary, 'lib', 'libnss3.so'))) {
    const extraction = extractLibraryPack(primary)
    if (extraction.ok) {
      report.libraries = extraction.alreadyPresent ? 'reused' : 'extracted'
    } else {
      // The matching archive is not part of the deployment; try the other one.
      const fallback = extractLibraryPack(secondary)
      report.libraries = fallback.ok ? 'extracted-fallback' : extraction.reason
      if (fallback.ok) pack = secondary
    }
  } else {
    report.libraries = 'reused'
  }

  const destination = path.join(os.tmpdir(), pack)
  const libraryDir = path.join(destination, 'lib')

  if (fs.existsSync(libraryDir)) {
    const current = (process.env.LD_LIBRARY_PATH || '').split(':').filter(Boolean)
    if (!current.includes(libraryDir)) {
      process.env.LD_LIBRARY_PATH = [libraryDir, ...current].join(':')
    }
    report.libraryPath = libraryDir
  }

  // The font archive is inflated by @sparticuz/chromium into /tmp/fonts.
  if (!process.env.FONTCONFIG_PATH) process.env.FONTCONFIG_PATH = path.join(os.tmpdir(), 'fonts')

  report.applied = true
  return report
}

/**
 * Resolve the Chromium executable for a serverless run.
 * @returns {Promise<{executablePath: string, args: string[], environment: object}>}
 */
export async function resolveServerlessChromium() {
  const environmentReport = prepareServerlessEnvironment()

  // @sparticuz/chromium 131 keeps `setGraphicsMode` as a no-op upstream, so the
  // graphics stack would still be inflated and added to the launch arguments.
  // The scanner never renders WebGL, so the property is disabled directly.
  chromium.graphicsMode = false

  const executablePath = await chromium.executablePath()
  const args = Array.isArray(chromium.args) ? chromium.args : []

  const diagnostics = {
    executable: path.basename(executablePath || ''),
    binaryPresent: Boolean(executablePath) && fs.existsSync(executablePath),
    libraries: environmentReport.libraries,
    libraryPathReady: Boolean(environmentReport.libraryPath),
    fonts: Boolean(process.env.FONTCONFIG_PATH),
    home: Boolean(process.env.HOME),
    argumentCount: args.length,
  }

  return { executablePath, args, diagnostics }
}
