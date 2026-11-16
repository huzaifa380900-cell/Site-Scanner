export const SEVERITY_META = {
  critical: {
    label: 'Critical',
    badge: 'bg-rose-100 text-rose-700 border border-rose-300',
    dot: 'bg-rose-500',
    border: 'border-l-rose-500',
    text: 'text-rose-600',
  },
  high: {
    label: 'High',
    badge: 'bg-orange-100 text-orange-700 border border-orange-300',
    dot: 'bg-orange-500',
    border: 'border-l-orange-500',
    text: 'text-orange-600',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-amber-100 text-amber-700 border border-amber-300',
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
    text: 'text-amber-600',
  },
  low: {
    label: 'Low',
    badge: 'bg-lime-100 text-lime-800 border border-lime-300',
    dot: 'bg-lime-500',
    border: 'border-l-lime-500',
    text: 'text-lime-700',
  },
  info: {
    label: 'Info',
    badge: 'bg-slate-100 text-slate-600 border border-slate-300',
    dot: 'bg-slate-400',
    border: 'border-l-slate-400',
    text: 'text-slate-600',
  },
}

export const KIND_LABELS = {
  observation: 'Confirmed observation',
  'potential-issue': 'Potential issue',
  recommendation: 'Recommendation',
  inconclusive: 'Inconclusive',
}

export const CATEGORY_LABELS = {
  http: 'HTTP',
  'security-headers': 'Security headers',
  metadata: 'Metadata',
  accessibility: 'Accessibility',
  transport: 'Transport security',
  technology: 'Technology',
  links: 'Links',
  browser: 'Browser',
  resources: 'Resources',
  security: 'Scanner security',
  'server-configuration': 'Server configuration',
  general: 'General',
}

export const TECH_CATEGORY_LABELS = {
  frontend: 'Frontend frameworks & libraries',
  cms: 'CMS platforms',
  analytics: 'Analytics & tracking',
  ui: 'UI libraries',
  cdn: 'CDN & infrastructure',
  server: 'Server technologies',
}

export const CONFIDENCE_CLASSES = {
  high: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  medium: 'bg-lime-100 text-lime-800 border border-lime-300',
  low: 'bg-slate-100 text-slate-500 border border-slate-300',
}

export function severityMeta(severity) {
  return SEVERITY_META[severity] || SEVERITY_META.info
}

export function kindLabel(kind) {
  return KIND_LABELS[kind] || 'Observation'
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || String(category || 'General').replace(/-/g, ' ')
}

export function techCategoryLabel(category) {
  return TECH_CATEGORY_LABELS[category] || 'Other'
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return '—'
  const value = Number(ms)
  if (value < 1000) return `${Math.max(0, Math.round(value))} ms`
  if (value < 10000) return `${(value / 1000).toFixed(2)} s`
  return `${(value / 1000).toFixed(1)} s`
}

export function formatDate(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function timeAgo(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return formatDate(date)
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return '—'
  const value = Number(bytes)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

export function hostnameOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return String(url || '—')
  }
}

export function truncate(value, max = 90) {
  const text = String(value ?? '')
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export function truncateMiddle(value, max = 60) {
  const text = String(value ?? '')
  if (text.length <= max) return text
  const head = Math.ceil((max - 1) / 2)
  const tail = Math.floor((max - 1) / 2)
  return `${text.slice(0, head)}…${text.slice(-tail)}`
}

export function scoreTone(score) {
  if (score === null || score === undefined) {
    return { stroke: '#94a3b8', text: 'text-slate-500', label: 'Unavailable' }
  }
  if (score >= 80) return { stroke: '#84cc16', text: 'text-lime-600', label: 'Good' }
  if (score >= 60) return { stroke: '#a3e635', text: 'text-lime-600', label: 'Fair' }
  if (score >= 40) return { stroke: '#f59e0b', text: 'text-amber-600', label: 'Needs attention' }
  return { stroke: '#ef4444', text: 'text-rose-600', label: 'Poor' }
}

export function statusCodeTone(statusCode) {
  const code = Number(statusCode)
  if (!code) return 'bg-slate-100 text-slate-500 border border-slate-300'
  if (code >= 200 && code < 300) return 'bg-emerald-100 text-emerald-700 border border-emerald-300'
  if (code >= 300 && code < 400) return 'bg-sky-100 text-sky-700 border border-sky-300'
  if (code >= 400 && code < 500) return 'bg-amber-100 text-amber-700 border border-amber-300'
  return 'bg-rose-100 text-rose-700 border border-rose-300'
}

export function sanitizeFilename(value) {
  return String(value || 'report')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function validateUrlInput(raw) {
  const input = String(raw ?? '').trim()
  if (!input) return { valid: false, message: 'Enter a website URL to scan.' }
  if (input.length > 2048) return { valid: false, message: 'The URL is too long.' }

  let parsed
  try {
    parsed = new URL(input)
  } catch {
    return { valid: false, message: 'Enter a valid absolute URL, for example https://example.com.' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, message: 'Only http:// and https:// URLs are supported.' }
  }
  if (parsed.username || parsed.password) {
    return { valid: false, message: 'URLs containing usernames or passwords are not allowed.' }
  }
  if (!parsed.hostname) {
    return { valid: false, message: 'The URL does not contain a valid hostname.' }
  }

  return { valid: true, value: parsed.href }
}
