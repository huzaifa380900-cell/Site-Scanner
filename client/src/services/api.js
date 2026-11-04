const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const OWNER_STORAGE_KEY = 'site-scanner-owner-id'
let fallbackOwnerId = null

export class ApiError extends Error {
  constructor(code, message, status = 0, details = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function getOwnerId() {
  try {
    const current = window.localStorage.getItem(OWNER_STORAGE_KEY)
    if (current && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(current)) {
      return current
    }

    const ownerId = globalThis.crypto?.randomUUID?.()
    if (!ownerId) throw new ApiError('OWNER_ID_UNAVAILABLE', 'Browser history storage is unavailable.')
    window.localStorage.setItem(OWNER_STORAGE_KEY, ownerId)
    return ownerId
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (!fallbackOwnerId) {
      fallbackOwnerId = globalThis.crypto?.randomUUID?.()
      if (!fallbackOwnerId) {
        throw new ApiError('OWNER_ID_UNAVAILABLE', 'Browser history storage is unavailable.')
      }
    }
    return fallbackOwnerId
  }
}

async function request(path, { method = 'GET', body, ownerScoped = false } = {}) {
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(ownerScoped ? { 'X-Scanner-Owner': getOwnerId() } : {}),
  }
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
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
  createScan: (url) => request('/scans', { method: 'POST', body: { url }, ownerScoped: true }),
  listScans: ({ page = 1, limit = 12 } = {}) =>
    request(`/scans?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`, { ownerScoped: true }),
  getScan: (id) => request(`/scans/${encodeURIComponent(id)}`, { ownerScoped: true }),
  deleteScan: (id) => request(`/scans/${encodeURIComponent(id)}`, { method: 'DELETE', ownerScoped: true }),
}
