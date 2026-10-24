<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, Search, ShieldCheck } from 'lucide-vue-next'
import {
  categoryLabel,
  kindLabel,
  CONFIDENCE_CLASSES,
  severityMeta,
} from '../utils/formatters.js'

const props = defineProps({
  findings: { type: Array, default: () => [] },
})

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
const severityFilter = ref('all')
const categoryFilter = ref('all')
const query = ref('')

const severityCounts = computed(() => {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  for (const finding of props.findings) {
    if (counts[finding.severity] !== undefined) counts[finding.severity] += 1
  }
  return counts
})

const categories = computed(() => {
  const map = new Map()
  for (const finding of props.findings) {
    map.set(finding.category, (map.get(finding.category) || 0) + 1)
  }
  return [...map.entries()].map(([value, count]) => ({ value, label: categoryLabel(value), count }))
})

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return props.findings.filter((finding) => {
    if (severityFilter.value !== 'all' && finding.severity !== severityFilter.value) return false
    if (categoryFilter.value !== 'all' && finding.category !== categoryFilter.value) return false
    if (!needle) return true
    return `${finding.title} ${finding.description} ${finding.category}`.toLowerCase().includes(needle)
  })
})

function resetFilters() {
  severityFilter.value = 'all'
  categoryFilter.value = 'all'
  query.value = ''
}
</script>

<template>
  <div>
    <div v-if="!findings.length" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-6 py-12 text-center">
      <ShieldCheck :size="28" class="text-emerald-400/80" />
      <p class="mt-3 text-sm font-medium text-slate-200">No findings were generated</p>
      <p class="mt-1 max-w-md text-xs text-slate-500">
        The scan completed without observations that met the reporting threshold. This is not a certification of security.
      </p>
    </div>

    <template v-else>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter findings by severity">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
            :class="severityFilter === 'all' ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-slate-200'"
            @click="severityFilter = 'all'"
          >
            All
            <span class="tabular text-slate-500">{{ findings.length }}</span>
          </button>
          <button
            v-for="severity in SEVERITY_ORDER"
            :key="severity"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
            :class="severityFilter === severity ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-slate-200'"
            @click="severityFilter = severity"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="severityMeta(severity).dot" />
            {{ severityMeta(severity).label }}
            <span class="tabular text-slate-500">{{ severityCounts[severity] }}</span>
          </button>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label class="relative flex-1">
            <span class="sr-only">Search findings</span>
            <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              v-model="query"
              type="search"
              placeholder="Search findings…"
              class="input input-bordered input-sm h-9 w-full border-white/10 bg-[#070d19] pl-8 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none"
            />
          </label>
          <select
            v-model="categoryFilter"
            class="select select-bordered select-sm h-9 w-full border-white/10 bg-[#070d19] text-xs text-slate-300 focus:border-cyan-400/50 focus:outline-none sm:w-56"
            aria-label="Filter findings by category"
          >
            <option value="all">All categories</option>
            <option v-for="category in categories" :key="category.value" :value="category.value">
              {{ category.label }} ({{ category.count }})
            </option>
          </select>
          <button
            v-if="severityFilter !== 'all' || categoryFilter !== 'all' || query"
            type="button"
            class="btn btn-ghost btn-xs h-8 min-h-0 text-slate-400"
            @click="resetFilters"
          >
            Reset
          </button>
        </div>

        <p class="text-[11px] text-slate-500">
          Showing {{ filtered.length }} of {{ findings.length }} findings. Severity reflects potential impact — not proof of
          exploitability.
        </p>

        <div v-if="filtered.length" class="space-y-3">
          <article
            v-for="finding in filtered"
            :key="finding.id"
            class="rounded-xl border border-white/[0.06] border-l-2 bg-white/[0.015] p-4 transition-colors hover:bg-white/[0.03]"
            :class="severityMeta(finding.severity).border"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex min-w-0 items-start gap-2.5">
                <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="severityMeta(finding.severity).dot" />
                <div class="min-w-0">
                  <h3 class="text-sm font-medium leading-snug text-slate-100">{{ finding.title }}</h3>
                  <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span class="badge badge-sm border-0 text-[10px] font-semibold" :class="severityMeta(finding.severity).badge">
                      {{ severityMeta(finding.severity).label }}
                    </span>
                    <span class="chip">{{ kindLabel(finding.kind) }}</span>
                    <span class="chip">{{ categoryLabel(finding.category) }}</span>
                    <span
                      class="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px]"
                      :class="CONFIDENCE_CLASSES[finding.confidence] || CONFIDENCE_CLASSES.medium"
                    >
                      {{ finding.confidence || 'medium' }} confidence
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p class="mt-3 text-[13px] leading-relaxed text-slate-300">{{ finding.description }}</p>

            <p v-if="finding.affectedUrl" class="mt-2 truncate font-mono text-[11px] text-slate-500" :title="finding.affectedUrl">
              {{ finding.affectedUrl }}
            </p>

            <details class="group mt-3">
              <summary class="flex w-full cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:text-cyan-300">
                <ChevronDown :size="14" class="transition-transform group-open:rotate-180" />
                Evidence &amp; recommended fix
              </summary>
              <div class="mt-2.5 space-y-3 rounded-lg border border-white/[0.05] bg-[#070d19]/60 p-3">
                <div>
                  <p class="eyebrow">Evidence</p>
                  <pre class="code-block mt-1.5">{{ finding.evidence || 'No additional evidence recorded.' }}</pre>
                </div>
                <div>
                  <p class="eyebrow">Recommendation</p>
                  <p class="mt-1.5 text-[13px] leading-relaxed text-slate-300">
                    {{ finding.recommendation || 'No remediation is required for this observation.' }}
                  </p>
                </div>
              </div>
            </details>
          </article>
        </div>

        <div v-else class="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
          <p class="text-sm text-slate-300">No findings match these filters.</p>
          <button type="button" class="btn btn-ghost btn-sm mt-2 text-cyan-300" @click="resetFilters">Clear filters</button>
        </div>
      </div>
    </template>
  </div>
</template>
