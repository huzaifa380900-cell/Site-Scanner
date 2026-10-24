export const SEVERITY_META = {
  critical: {
    label: 'Critical',
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-400/25',
    dot: 'bg-rose-400',
    border: 'border-l-rose-500',
    text: 'text-rose-300',
  },
  high: {
    label: 'High',
    badge: 'bg-orange-500/15 text-orange-300 border border-orange-400/25',
    dot: 'bg-orange-400',
    border: 'border-l-orange-500',
    text: 'text-orange-300',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-400/25',
    dot: 'bg-amber-400',
    border: 'border-l-amber-500',
    text: 'text-amber-300',
  },
  low: {
    label: 'Low',
    badge: 'bg-sky-500/15 text-sky-300 border border-sky-400/25',
    dot: 'bg-sky-400',
    border: 'border-l-sky-500',
    text: 'text-sky-300',
  },
  info: {
    label: 'Info',
    badge: 'bg-slate-500/15 text-slate-300 border border-slate-400/20',
    dot: 'bg-slate-400',
    border: 'border-l-slate-500',
    text: 'text-slate-300',
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
  high: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20',
  medium: 'bg-cyan-500/10 text-cyan-300 border border-cyan-400/20',
  low: 'bg-slate-500/10 text-slate-400 border border-slate-400/20',
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
    return { stroke: '#475569', text: 'text-slate-400', label: 'Unavailable' }
  }
  if (score >= 80) return { stroke: '#34d399', text: 'text-emerald-300', label: 'Good' }
  if (score >= 60) return { stroke: '#22d3ee', text: 'text-cyan-300', label: 'Fair' }
  if (score >= 40) return { stroke: '#fbbf24', text: 'text-amber-300', label: 'Needs attention' }
  return { stroke: '#fb7185', text: 'text-rose-300', label: 'Poor' }
}

export function statusCodeTone(statusCode) {
  const code = Number(statusCode)
  if (!code) return 'bg-slate-500/15 text-slate-300 border-slate-400/20'
  if (code >= 200 && code < 300) return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25'
  if (code >= 300 && code < 400) return 'bg-sky-500/15 text-sky-300 border-sky-400/25'
  if (code >= 400 && code < 500) return 'bg-amber-500/15 text-amber-300 border-amber-400/25'
  return 'bg-rose-500/15 text-rose-300 border-rose-400/25'
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
