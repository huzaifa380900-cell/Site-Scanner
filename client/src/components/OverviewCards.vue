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
  <section class="panel overflow-hidden animate-fade-up">
    <div class="panel-head">
      <div class="min-w-0">
        <p class="eyebrow">Scan report</p>
        <h2 class="mt-0.5 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
          {{ report.hostname }}
        </h2>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="badge badge-sm border-0 font-medium"
          :class="report.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'"
        >
          {{ report.status === 'completed' ? 'Completed' : report.status }}
        </span>
        <button class="btn btn-sm h-9 min-h-0 gap-2 border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]" @click="$emit('export')">
          <Download :size="15" />
          Export JSON
        </button>
      </div>
    </div>

    <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <div class="rounded-xl border border-white/[0.06] bg-[#070d19]/70 p-5">
        <div class="flex items-center justify-between gap-2">
          <p class="eyebrow">Observation score</p>
          <span class="tooltip tooltip-left" data-tip="Heuristic website-health indicator (0–100), not a certified security score. Findings deduct points by severity.">
            <Info :size="14" class="text-slate-500" aria-label="Score method information" />
          </span>
        </div>

        <div class="relative mx-auto mt-3 h-32 w-32">
          <svg viewBox="0 0 100 100" class="h-32 w-32 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" stroke-width="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              :stroke="tone.stroke"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="offset"
              class="transition-all duration-700"
            />
          </svg>
          <div class="absolute inset-0 grid place-items-center text-center">
            <div>
              <p class="text-3xl font-semibold tabular" :class="tone.text">
                {{ score === null || score === undefined ? '—' : score }}
              </p>
              <p class="text-[11px] text-slate-500">{{ tone.label }}</p>
            </div>
          </div>
        </div>

        <p class="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
          <span v-if="score === null || score === undefined">Insufficient evidence to calculate a score.</span>
          <span v-else>Heuristic health indicator — not a certified security score.</span>
        </p>

        <div class="mt-4 grid grid-cols-5 gap-1 border-t border-white/[0.06] pt-3">
          <div v-for="severity in ['critical', 'high', 'medium', 'low', 'info']" :key="severity" class="text-center">
            <p class="text-sm font-semibold tabular" :class="severityMeta(severity).text">
              {{ severityCounts[severity] }}
            </p>
            <p class="text-[10px] capitalize text-slate-500">{{ severity }}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.1]"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">{{ stat.label }}</p>
            <component :is="stat.icon" :size="15" class="text-slate-500" aria-hidden="true" />
          </div>
          <p class="mt-1.5 text-2xl font-semibold tabular text-slate-100">
            <span v-if="stat.badge" class="badge badge-lg border px-2.5 py-3 text-base font-semibold" :class="stat.badge">
              {{ stat.value }}
            </span>
            <span v-else>{{ stat.value }}</span>
          </p>
          <p class="mt-1 truncate text-[11px] text-slate-500">{{ stat.sub }}</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 border-t border-white/[0.06] px-5 py-3.5 text-[11px] text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:px-6">
      <span class="flex min-w-0 items-center gap-1.5">
        <Globe :size="13" class="shrink-0" />
        <a
          :href="report.targetUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="linkish truncate"
          :title="report.targetUrl"
        >
          {{ truncate(report.targetUrl, 82) }}
        </a>
        <ExternalLink :size="11" class="shrink-0 text-slate-600" />
      </span>
      <span class="hidden text-slate-700 sm:inline">|</span>
      <span>Scanned {{ formatDateTime(report.completedAt) }}</span>
      <span class="hidden text-slate-700 sm:inline">|</span>
      <span>Report ID <span class="font-mono text-slate-500">{{ truncate(report.id, 12) }}</span></span>
    </div>
  </section>
</template>
