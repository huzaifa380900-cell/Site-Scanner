<script setup>
import { computed, nextTick, ref } from 'vue'
import {
  Bug,
  CircleAlert,
  Cpu,
  Database,
  Globe,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-vue-next'
import PremiumNavbar from './components/premium/PremiumNavbar.vue'
import UrlScanner from './components/UrlScanner.vue'
import LoadingState from './components/LoadingState.vue'
import OverviewCards from './components/OverviewCards.vue'
import FindingsPanel from './components/FindingsPanel.vue'
import TechnologyPanel from './components/TechnologyPanel.vue'
import BrowserPanel from './components/BrowserPanel.vue'
import MetadataPanel from './components/MetadataPanel.vue'
import ScanHistory from './components/ScanHistory.vue'
import { useScanner } from './composables/useScanner.js'
import { hostnameOf } from './utils/formatters.js'

const {
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
  refreshHistory,
  runScan,
  openReport,
  deleteReport,
  exportReport,
  clearScanError,
} = useScanner()

const activeTab = ref('findings')
const resultsRef = ref(null)

const tabs = computed(() => {
  const report = selectedReport.value
  if (!report) return []
  return [
    { id: 'findings', label: 'Findings', count: report.findings?.length || 0 },
    { id: 'technologies', label: 'Technologies', count: report.technologies?.length || 0 },
    {
      id: 'browser',
      label: 'Browser',
      count: (report.browserErrors?.length || 0) + (report.failedResources?.length || 0),
    },
    { id: 'metadata', label: 'Metadata & HTTP', count: null },
  ]
})

const errorHint = computed(() => {
  switch (scanError.value?.code) {
    case 'DATABASE_UNAVAILABLE':
    case 'DATABASE_WRITE_FAILED':
      return 'MongoDB Atlas is not reachable. Add MONGODB_URI to server/.env, confirm network access in Atlas, then check /api/health.'
    case 'SCAN_CAPACITY_EXCEEDED':
      return 'The scanner is at capacity. Wait a few seconds and try again.'
    case 'DUPLICATE_SCAN':
      return 'A scan for this hostname is already running. Wait for it to complete.'
    case 'RATE_LIMITED':
      return 'This IP has reached the scan rate limit. Try again later.'
    case 'TARGET_TIMEOUT':
    case 'SCAN_TIMEOUT':
      return 'The website took too long to respond. Try again or choose a lighter page.'
    case 'TARGET_UNREACHABLE':
      return 'The website refused the connection or could not be reached from the scanner.'
    case 'BROWSER_UNAVAILABLE':
    case 'BROWSER_BINARY_MISSING':
    case 'BROWSER_LIBS_MISSING':
    case 'BROWSER_LAUNCH_FAILED':
    case 'BROWSER_LAUNCH_TIMEOUT':
      return 'The server could not start its headless Chromium runtime. Check the Vercel runtime logs for the [browser] Chromium launch failed entry.'
    default:
      return null
  }
})

async function startScan(url) {
  activeTab.value = 'findings'
  const report = await runScan(url)
  if (report) {
    await nextTick()
    resultsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function selectReport(id) {
  // Set the tab before awaiting the request so a later user click is not
  // overwritten when the report arrives.
  activeTab.value = 'findings'
  await openReport(id)
  await nextTick()
  resultsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="min-h-screen pt-16 lg:pt-20">
    <PremiumNavbar />

    <main class="mx-auto grid max-w-7xl gap-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 xl:grid-cols-[minmax(0,1fr)_336px]">
      <div class="min-w-0 space-y-5">
        <UrlScanner :scanning="scanning" @scan="startScan" />

        <div
          v-if="scanError"
          class="flex items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 text-rose-100"
          role="alert"
        >
          <CircleAlert :size="18" class="mt-0.5 shrink-0 text-rose-300" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">{{ scanError.message }}</p>
            <p class="mt-1 text-[11px] text-rose-200/70">
              Error code <span class="font-mono">{{ scanError.code }}</span>
              <span v-if="scanError.status"> · HTTP {{ scanError.status }}</span>
            </p>
            <p v-if="errorHint" class="mt-1.5 text-[11px] leading-relaxed text-rose-200/80">{{ errorHint }}</p>
            <ul v-if="scanError.details?.length" class="mt-1.5 list-inside list-disc text-[11px] text-rose-200/80">
              <li v-for="(detail, index) in scanError.details" :key="index">
                {{ detail.field }}: {{ detail.message }}
              </li>
            </ul>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-xs h-7 min-h-0 shrink-0 text-rose-200 hover:bg-rose-500/10"
            aria-label="Dismiss error"
            @click="clearScanError"
          >
            <X :size="14" />
          </button>
        </div>

        <LoadingState v-if="scanning" :url="lastScanUrl" />

        <template v-else-if="selectedReport">
          <div ref="resultsRef" class="scroll-mt-24 space-y-5">
            <OverviewCards :report="selectedReport" @export="exportReport" />

            <section class="panel overflow-hidden">
              <div class="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] px-2 pt-2 sm:px-3">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  type="button"
                  role="tab"
                  :aria-selected="activeTab === tab.id"
                  class="relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2.5 text-xs font-medium transition-colors"
                  :class="activeTab === tab.id
                    ? 'bg-white/[0.03] text-white after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-cyan-400'
                    : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200'"
                  @click="activeTab = tab.id"
                >
                  {{ tab.label }}
                  <span
                    v-if="tab.count"
                    class="rounded px-1.5 py-0.5 text-[10px] tabular"
                    :class="activeTab === tab.id ? 'bg-cyan-400/15 text-cyan-200' : 'bg-white/[0.05] text-slate-400'"
                  >
                    {{ tab.count }}
                  </span>
                </button>
              </div>

              <div class="p-4 sm:p-5">
                <FindingsPanel v-if="activeTab === 'findings'" :findings="selectedReport.findings || []" />
                <TechnologyPanel v-else-if="activeTab === 'technologies'" :technologies="selectedReport.technologies || []" />
                <BrowserPanel v-else-if="activeTab === 'browser'" :report="selectedReport" />
                <MetadataPanel v-else-if="activeTab === 'metadata'" :report="selectedReport" />
              </div>
            </section>
          </div>
        </template>

        <section v-else class="panel overflow-hidden">
          <div class="panel-body">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <ScanSearch :size="24" class="text-cyan-300" />
              </span>
              <div class="min-w-0">
                <p class="eyebrow">Waiting for a target</p>
                <h2 class="mt-1 text-lg font-semibold tracking-tight text-white">Start with a public website</h2>
                <p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
                  Site Scanner performs a passive, bounded analysis: it fetches the page, parses the HTML, fingerprints
                  publicly visible technologies and loads the site once in headless Chromium. Every observation is real
                  scan data — nothing is mocked.
                </p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn btn-sm h-9 min-h-0 gap-2 border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
                    @click="startScan('https://example.com')"
                  >
                    <Globe :size="14" />
                    Scan example.com
                  </button>
                  <span class="inline-flex items-center gap-1.5 px-2 text-[11px] text-slate-500">
                    <ShieldCheck :size="13" />
                    Private and internal addresses are rejected server-side.
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <Globe :size="17" class="text-cyan-300" />
                <h3 class="mt-2 text-sm font-medium text-slate-200">HTTP &amp; security</h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Status, redirects, headers, HTTPS and framing/CSP observations.
                </p>
              </div>
              <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <Cpu :size="17" class="text-cyan-300" />
                <h3 class="mt-2 text-sm font-medium text-slate-200">Technology fingerprints</h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Frameworks, CMS, analytics, UI libraries and infrastructure — with evidence.
                </p>
              </div>
              <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <Bug :size="17" class="text-cyan-300" />
                <h3 class="mt-2 text-sm font-medium text-slate-200">Browser behaviour</h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Console errors, uncaught exceptions and failed resources in Chromium.
                </p>
              </div>
            </div>

            <div class="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.05] bg-[#070d19]/60 p-3 text-[11px] leading-relaxed text-slate-500">
              <Sparkles :size="13" class="mt-0.5 shrink-0 text-slate-500" />
              <span>
                No scan starts until you click <span class="text-slate-300">Scan Website</span>. The overall observation
                score is a heuristic health indicator, not a security certification.
              </span>
            </div>
          </div>
        </section>
      </div>

      <aside class="space-y-4 xl:sticky xl:top-[84px] xl:self-start">
        <ScanHistory
          :items="history"
          :loading="historyLoading"
          :error="historyError"
          :action-error="historyActionError"
          :deleting-id="deletingScanId"
          :selected-id="selectedReport?.id || ''"
          :disabled="scanning || loadingReport"
          @refresh="refreshHistory"
          @select="selectReport"
          @delete="deleteReport"
        />

        <section class="panel p-4">
          <div class="flex items-center gap-2">
            <Database :size="14" class="text-slate-400" />
            <h2 class="text-sm font-medium text-slate-200">How the score works</h2>
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-slate-500">
            Starts at 100 and deducts per finding: critical −30, high −15, medium −8, low −3, info 0. The floor is 0.
            When there is not enough evidence, the score is shown as unavailable.
          </p>
          <p class="mt-2 text-[11px] leading-relaxed text-slate-500">
            This is a website-health heuristic, not a certified security score, and it cannot prove a site is secure.
          </p>
        </section>

        <section class="panel p-4">
          <div class="flex items-center gap-2">
            <ShieldCheck :size="14" class="text-slate-400" />
            <h2 class="text-sm font-medium text-slate-200">Safe by design</h2>
          </div>
          <ul class="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-500">
            <li>• Only public HTTP/HTTPS targets are accepted.</li>
            <li>• DNS and every redirect are validated and pinned.</li>
            <li>• Browser traffic passes through an enforcing egress proxy.</li>
            <li>• No exploitation, brute force, logins or form submissions.</li>
            <li>• Scan concurrency, timeouts, ports and response sizes are bounded.</li>
          </ul>
        </section>
      </aside>
    </main>

    <footer class="border-t border-white/[0.06] py-6">
      <div class="mx-auto max-w-7xl px-4 text-center text-[11px] leading-relaxed text-slate-600 sm:px-6">
        <p>
          <span class="text-slate-400">Site Scanner</span> · Website Analysis &amp; Intelligence · Passive analysis of
          public websites.
        </p>
        <p class="mt-1">
          Findings are observations and recommendations, not a guarantee that a website is secure or bug-free.
        </p>
      </div>
    </footer>
  </div>
</template>
