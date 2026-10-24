const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(code, message, status = 0, details = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      'Unable to reach the Site Scanner API. Confirm the backend is running and try again.',
    )
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.success === false) {
    const error = payload?.error
    throw new ApiError(
      error?.code || `HTTP_${response.status}`,
      error?.message || `The request failed with HTTP ${response.status}.`,
      response.status,
      error?.details || null,
    )
  }

  return payload?.data ?? payload
}

export const api = {
  health: () => request('/health'),
  createScan: (url) => request('/scans', { method: 'POST', body: { url } }),
  listScans: ({ page = 1, limit = 12 } = {}) =>
    request(`/scans?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`),
  getScan: (id) => request(`/scans/${encodeURIComponent(id)}`),
}
