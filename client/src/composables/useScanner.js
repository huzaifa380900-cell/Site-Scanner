import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api, ApiError } from '../services/api.js'
import { sanitizeFilename } from '../utils/formatters.js'

/**
 * Single source of truth for scanning and history state.
 * Nothing is marked successful until the API returns a persisted report.
 */
export function useScanner() {
  const history = ref([])
  const historyLoading = ref(false)
  const historyError = ref(null)
  const historyActionError = ref(null)
  const deletingScanId = ref('')

  const selectedReport = ref(null)
  const loadingReport = ref(false)

  const scanning = ref(false)
  const scanError = ref(null)
  const scanElapsed = ref(0)
  const lastScanUrl = ref('')

  let elapsedTimer = null

  const hasReport = computed(() => Boolean(selectedReport.value))

  async function refreshHistory({ silent = false } = {}) {
    if (!silent) historyLoading.value = true
    historyError.value = null
    try {
      const data = await api.listScans({ page: 1, limit: 12 })
      history.value = data.items || []
    } catch (error) {
      historyError.value = error instanceof ApiError ? error : new ApiError('HISTORY_FAILED', 'Scan history could not be loaded.')
      history.value = []
    } finally {
      historyLoading.value = false
    }
  }

  function startElapsedTimer() {
    scanElapsed.value = 0
    const started = Date.now()
    clearInterval(elapsedTimer)
    elapsedTimer = setInterval(() => {
      scanElapsed.value = Math.floor((Date.now() - started) / 1000)
    }, 500)
  }

  function stopElapsedTimer() {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }

  async function runScan(url) {
    if (scanning.value) return null
    scanning.value = true
    scanError.value = null
    lastScanUrl.value = url
    startElapsedTimer()
    try {
      const report = await api.createScan(url)
      selectedReport.value = report
      await refreshHistory({ silent: true })
      return report
    } catch (error) {
      scanError.value =
        error instanceof ApiError
          ? error
          : new ApiError('SCAN_FAILED', 'The scan could not be completed. Please try again.')
      return null
    } finally {
      scanning.value = false
      stopElapsedTimer()
    }
  }

  async function openReport(id) {
    if (scanning.value || loadingReport.value) return
    loadingReport.value = true
    scanError.value = null
    try {
      selectedReport.value = await api.getScan(id)
    } catch (error) {
      scanError.value =
        error instanceof ApiError ? error : new ApiError('REPORT_FAILED', 'The scan report could not be loaded.')
    } finally {
      loadingReport.value = false
    }
  }

  async function deleteReport(id) {
    if (scanning.value || loadingReport.value || deletingScanId.value) return
    deletingScanId.value = id
    historyActionError.value = null
    try {
      await api.deleteScan(id)
      history.value = history.value.filter((item) => item.id !== id)
      if (selectedReport.value?.id === id) selectedReport.value = null
    } catch (error) {
      historyActionError.value =
        error instanceof ApiError
          ? error
          : new ApiError('DELETE_FAILED', 'The scan could not be deleted. Please try again.')
    } finally {
      deletingScanId.value = ''
    }
  }

  function exportReport() {
    const report = selectedReport.value
    if (!report) return
    const payload = {
      generator: 'Site Scanner',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      report,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date(report.completedAt || report.createdAt || Date.now()).toISOString().replace(/[:.]/g, '-')
    link.href = objectUrl
    link.download = `site-scanner-${sanitizeFilename(report.hostname)}-${stamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
  }

  function clearScanError() {
    scanError.value = null
  }

  onMounted(() => {
    refreshHistory({ silent: true })
  })

  onUnmounted(() => {
    clearInterval(elapsedTimer)
  })

  return {
    history,
    historyLoading,
    historyError,
    historyActionError,
    deletingScanId,
    selectedReport,
    loadingReport,
    scanning,
    scanError,
    scanElapsed,
    lastScanUrl,
    hasReport,
    refreshHistory,
    runScan,
    openReport,
    deleteReport,
    exportReport,
    clearScanError,
  }
}
