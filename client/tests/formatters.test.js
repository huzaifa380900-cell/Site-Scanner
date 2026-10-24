import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDuration,
  hostnameOf,
  sanitizeFilename,
  scoreTone,
  severityMeta,
  techCategoryLabel,
  truncate,
  validateUrlInput,
} from '../src/utils/formatters.js'

describe('URL input validation (UX only; the backend is authoritative)', () => {
  it.each([
    ['https://example.com', 'https://example.com/'],
    ['http://example.com/path?q=1', 'http://example.com/path?q=1'],
    ['  https://example.com  ', 'https://example.com/'],
  ])('accepts %j', (input, normalized) => {
    const result = validateUrlInput(input)
    expect(result.valid).toBe(true)
    expect(result.value).toBe(normalized)
  })

  it.each([
    ['', /enter a website url/i],
    ['example.com', /valid absolute url/i],
    ['ftp://example.com', /only http/i],
    ['javascript:alert(1)', /only http/i],
    ['https://user:pass@example.com', /usernames or passwords/i],
  ])('rejects %j', (input, message) => {
    const result = validateUrlInput(input)
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(message)
  })
})

describe('formatters', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 ms')
    expect(formatDuration(850)).toBe('850 ms')
    expect(formatDuration(1200)).toBe('1.20 s')
    expect(formatDuration(34500)).toBe('34.5 s')
    expect(formatDuration(null)).toBe('—')
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB')
    expect(formatBytes(undefined)).toBe('—')
  })

  it('extracts hostnames safely', () => {
    expect(hostnameOf('https://www.example.com/a')).toBe('www.example.com')
    expect(hostnameOf('not a url')).toBe('not a url')
  })

  it('maps score tones by band', () => {
    expect(scoreTone(92).label).toBe('Good')
    expect(scoreTone(70).label).toBe('Fair')
    expect(scoreTone(45).label).toBe('Needs attention')
    expect(scoreTone(10).label).toBe('Poor')
    expect(scoreTone(null).label).toBe('Unavailable')
  })

  it('falls back to info severity for unknown values', () => {
    expect(severityMeta('bogus').label).toBe('Info')
    expect(severityMeta('high').label).toBe('High')
  })

  it('labels technology categories', () => {
    expect(techCategoryLabel('frontend')).toContain('Frontend')
    expect(techCategoryLabel('unknown')).toBe('Other')
  })

  it('sanitizes download filenames', () => {
    expect(sanitizeFilename('https://example.com/a b')).toBe('https-example.com-a-b')
    expect(sanitizeFilename('')).toBe('report')
  })

  it('truncates long strings', () => {
    expect(truncate('abcdef', 4)).toBe('abcd…')
    expect(truncate('abc', 4)).toBe('abc')
  })
})
