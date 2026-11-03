<script setup>
import { computed } from 'vue'
import {
  Bug,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileWarning,
  Globe,
  Info,
  ShieldAlert,
} from 'lucide-vue-next'
import {
  formatDateTime,
  formatDuration,
  scoreTone,
  severityMeta,
  statusCodeTone,
  truncate,
} from '../utils/formatters.js'

const props = defineProps({
  report: { type: Object, required: true },
})
defineEmits(['export'])

const score = computed(() => props.report.observationScore)
const tone = computed(() => scoreTone(score.value))
const radius = 42
const circumference = 2 * Math.PI * radius
const offset = computed(() => {
  if (score.value === null || score.value === undefined) return circumference
  return circumference * (1 - Math.min(100, Math.max(0, Number(score.value))) / 100)
})

const consoleErrors = computed(
  () => (props.report.browserErrors || []).filter((item) => item.type === 'console').length,
)
const pageErrors = computed(
  () => (props.report.browserErrors || []).filter((item) => item.type === 'pageerror').length,
)
const failedResources = computed(() => (props.report.failedResources || []).length)

const severityCounts = computed(() => {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  for (const finding of props.report.findings || []) {
    if (counts[finding.severity] !== undefined) counts[finding.severity] += 1
  }
  return counts
})

const stats = computed(() => [
  {
    label: 'HTTP status',
    value: props.report.httpStatus ?? '—',
    sub: props.report.security?.https ? 'Served over HTTPS' : 'No HTTPS observed',
    icon: Globe,
    badge: statusCodeTone(props.report.httpStatus),
  },
  {
    label: 'Scan duration',
    value: formatDuration(props.report.durationMs),
    sub: 'Total server pipeline time',
    icon: Clock,
  },
  {
    label: 'Findings',
    value: props.report.findingCount ?? (props.report.findings || []).length,
    sub: 'Observations & recommendations',
    icon: ShieldAlert,
  },
  {
    label: 'Technologies',
    value: (props.report.technologies || []).length,
    sub: 'Passive fingerprint matches',
    icon: Cpu,
  },
  {
    label: 'Console errors',
    value: consoleErrors.value,
    sub: `${pageErrors.value} uncaught page error${pageErrors.value === 1 ? '' : 's'}`,
    icon: Bug,
  },
  {
    label: 'Failed resources',
    value: failedResources.value,
    sub: `Browser checks: ${props.report.browser?.status || 'unknown'}`,
    icon: FileWarning,
  },
])
</script>

<template>
  <section class="panel panel-body animate-fade-up relative overflow-hidden">
    <!-- Ambient background glow -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="shimmer-line absolute inset-x-0 top-0 h-px" />
      <div class="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div class="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
    </div>

    <!-- ═══════════════════════════════════════════════════
         HEADER
         ═══════════════════════════════════════════════════ -->
    <div class="panel-head relative">
      <div class="min-w-0">
        <p class="eyebrow">Scan report</p>
        <h2 class="mt-0.5 truncate bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:text-xl">
          {{ report.hostname }}
        </h2>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="badge badge-sm border-0 font-medium shadow-sm transition-transform duration-300 hover:scale-105"
          :class="
            report.status === 'completed'
              ? 'bg-emerald-500/15 text-emerald-300 shadow-emerald-500/10'
              : 'bg-rose-500/15 text-rose-300 shadow-rose-500/10'
          "
        >
          <span class="relative mr-1 inline-flex h-1.5 w-1.5">
            <span
              v-if="report.status === 'completed'"
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
            />
            <span
              class="relative inline-flex h-1.5 w-1.5 rounded-full"
              :class="report.status === 'completed' ? 'bg-emerald-400' : 'bg-rose-400'"
            />
          </span>
          {{ report.status === 'completed' ? 'Completed' : report.status }}
        </span>
        <button
          class="btn btn-sm h-9 min-h-0 gap-2 border-white/10 bg-white/[0.03] text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-cyan-400/[0.08] hover:text-cyan-200 hover:shadow-lg hover:shadow-cyan-500/10"
          @click="$emit('export')"
        >
          <Download :size="15" class="transition-transform duration-300 group-hover:translate-y-0.5" />
          Export JSON
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════
         BODY GRID
         ═══════════════════════════════════════════════════ -->
    <div class="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <!-- ─── Score card ─────────────────────────────── -->
      <div class="group/score relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#070d19]/70 p-5 transition-colors duration-300 hover:border-white/[0.1]">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent opacity-0 transition-opacity duration-500 group-hover/score:opacity-100" />

        <div class="flex items-center justify-between gap-2">
          <p class="eyebrow">Observation score</p>
          <span
            class="tooltip tooltip-left"
            data-tip="Heuristic website-health indicator (0–100), not a certified security score. Findings deduct points by severity."
          >
            <Info
              :size="14"
              class="cursor-help text-slate-500 transition-colors duration-300 hover:text-cyan-300"
              aria-label="Score method information"
            />
          </span>
        </div>

        <!-- Animated score ring -->
        <div class="relative mx-auto mt-3 h-32 w-32">
          <!-- Glow halo -->
          <div
            class="absolute inset-2 rounded-full blur-2xl opacity-40 transition-opacity duration-500 group-hover/score:opacity-70"
            :style="{ backgroundColor: tone.stroke }"
          />
          <svg viewBox="0 0 100 100" class="relative h-32 w-32 -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient :id="`scoreGrad-${report.id}`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" :stop-color="tone.stroke" stop-opacity="0.6" />
                <stop offset="100%" :stop-color="tone.stroke" stop-opacity="1" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" stroke-width="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              :stroke="`url(#scoreGrad-${report.id})`"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="offset"
              class="transition-all duration-1000 ease-out"
            />
          </svg>
          <div class="absolute inset-0 grid place-items-center text-center">
            <div>
              <p class="text-3xl font-bold tabular" :class="tone.text">
                {{ score === null || score === undefined ? '—' : score }}
              </p>
              <p class="text-[11px] font-medium text-slate-500">{{ tone.label }}</p>
            </div>
          </div>
        </div>

        <p class="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
          <span v-if="score === null || score === undefined">Insufficient evidence to calculate a score.</span>
          <span v-else>Heuristic health indicator — not a certified security score.</span>
        </p>

        <!-- Severity breakdown -->
        <div class="mt-4 grid grid-cols-5 gap-1 border-t border-white/[0.06] pt-3">
          <div
            v-for="severity in ['critical', 'high', 'medium', 'low', 'info']"
            :key="severity"
            class="group/sev cursor-default rounded-md py-1 text-center transition-colors duration-200 hover:bg-white/[0.03]"
          >
            <p class="text-sm font-bold tabular transition-transform duration-300 group-hover/sev:scale-110" :class="severityMeta(severity).text">
              {{ severityCounts[severity] }}
            </p>
            <p class="text-[10px] capitalize text-slate-500">{{ severity }}</p>
          </div>
        </div>
      </div>

      <!-- ─── Stat cards ─────────────────────────────── -->
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="group/stat relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.035] hover:shadow-lg hover:shadow-black/20"
          :style="{ animationDelay: `${index * 40}ms` }"
        >
          <!-- Per-card top shimmer -->
          <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition-opacity duration-500 group-hover/stat:opacity-100" />
          <!-- Corner glow -->
          <div class="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-cyan-500/[0.06] blur-2xl opacity-0 transition-opacity duration-500 group-hover/stat:opacity-100" />

          <div class="relative flex items-start justify-between gap-2">
            <p class="text-[11px] font-medium uppercase tracking-wider text-slate-500">{{ stat.label }}</p>
            <component
              :is="stat.icon"
              :size="15"
              class="text-slate-500 transition-all duration-300 group-hover/stat:text-cyan-300 group-hover/stat:scale-110"
              aria-hidden="true"
            />
          </div>
          <p class="relative mt-1.5 text-2xl font-bold tabular text-slate-100">
            <span
              v-if="stat.badge"
              class="badge badge-lg border px-2.5 py-3 text-base font-semibold shadow-sm transition-transform duration-300 group-hover/stat:scale-105"
              :class="stat.badge"
            >
              {{ stat.value }}
            </span>
            <span v-else>{{ stat.value }}</span>
          </p>
          <p class="relative mt-1 truncate text-[11px] text-slate-500">{{ stat.sub }}</p>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════
         FOOTER META
         ═══════════════════════════════════════════════════ -->
    <div class="relative flex flex-col gap-2 border-t border-white/[0.06] bg-white/[0.01] px-5 py-3.5 text-[11px] text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:px-6">
      <span class="group/url flex min-w-0 items-center gap-1.5">
        <Globe :size="13" class="shrink-0 text-cyan-400/70 transition-colors duration-300 group-hover/url:text-cyan-300" />
        <a
          :href="report.targetUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="linkish truncate font-mono transition-colors duration-200 hover:text-cyan-300"
          :title="report.targetUrl"
        >
          {{ truncate(report.targetUrl, 82) }}
        </a>
        <ExternalLink :size="11" class="shrink-0 text-slate-600 transition-all duration-200 group-hover/url:-translate-y-0.5 group-hover/url:translate-x-0.5 group-hover/url:text-cyan-300" />
      </span>
      <span class="hidden text-slate-700 sm:inline">|</span>
      <span>
        Scanned <span class="font-medium text-slate-400">{{ formatDateTime(report.completedAt) }}</span>
      </span>
      <span class="hidden text-slate-700 sm:inline">|</span>
      <span>
        Report ID
        <span class="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-slate-400">{{ truncate(report.id, 12) }}</span>
      </span>
    </div>
  </section>
</template>

<style scoped>
/* Top shimmer */
.shimmer-line {
  background-image: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.6), transparent);
  background-size: 200% 100%;
  animation: shimmerBorder 5s ease-in-out infinite;
}
@keyframes shimmerBorder {
  0%, 100% { background-position: 200% 0; }
  50% { background-position: -200% 0; }
}
</style>
