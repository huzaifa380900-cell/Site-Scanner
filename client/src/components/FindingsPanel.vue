<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, Search, ShieldCheck, X } from 'lucide-vue-next'
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
    <!-- ═══════════════════════════════════════════════════════
         EMPTY STATE
         ═══════════════════════════════════════════════════════ -->
    <div
      v-if="!findings.length"
      class="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center"
    >
      <div class="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
      <div class="relative grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300 bg-emerald-100 shadow-sm shadow-emerald-200/50">
        <ShieldCheck :size="28" class="text-emerald-600" />
      </div>
      <p class="relative mt-4 text-sm font-semibold text-gray-900">No findings were generated</p>
      <p class="relative mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
        The scan completed without observations that met the reporting threshold. This is not a certification of security.
      </p>
    </div>

    <template v-else>
      <div class="flex flex-col gap-4">
        <!-- ─── Severity filter pills ───────────────────── -->
        <div
          class="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter findings by severity"
        >
          <button
            type="button"
            class="group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-300"
            :class="
              severityFilter === 'all'
                ? 'border-lime-400 bg-lime-100 text-lime-800 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700'
            "
            @click="severityFilter = 'all'"
          >
            All
            <span class="tabular text-slate-400 transition-colors group-hover:text-slate-500">{{ findings.length }}</span>
          </button>
          <button
            v-for="severity in SEVERITY_ORDER"
            :key="severity"
            type="button"
            class="group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-300"
            :class="
              severityFilter === severity
                ? 'border-lime-400 bg-lime-100 text-lime-800 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700'
            "
            @click="severityFilter = severity"
          >
            <span class="h-1.5 w-1.5 rounded-full transition-transform duration-300 group-hover:scale-125" :class="severityMeta(severity).dot" />
            {{ severityMeta(severity).label }}
            <span class="tabular text-slate-400 transition-colors group-hover:text-slate-500">{{ severityCounts[severity] }}</span>
          </button>
        </div>

        <!-- ─── Search + category + reset ──────────────── -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label class="group relative flex-1">
            <span class="sr-only">Search findings</span>
            <Search
              :size="14"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-lime-600"
            />
            <input
              v-model="query"
              type="search"
              placeholder="Search findings…"
              class="input input-bordered input-sm h-9 w-full border-slate-200 bg-white pl-8 text-xs text-gray-900 placeholder:text-slate-400 transition-all duration-300 focus:border-lime-400 focus:shadow-[0_0_0_3px_rgba(132,204,22,0.12)] focus:outline-none"
            />
          </label>
          <select
            v-model="categoryFilter"
            class="select select-bordered select-sm h-9 w-full cursor-pointer border-slate-200 bg-white text-xs text-slate-700 transition-all duration-300 hover:border-slate-300 focus:border-lime-400 focus:shadow-[0_0_0_3px_rgba(132,204,22,0.12)] focus:outline-none sm:w-56"
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
            class="btn btn-ghost btn-xs h-8 min-h-0 gap-1.5 text-slate-500 transition-colors hover:text-rose-600"
            @click="resetFilters"
          >
            <X :size="12" />
            Reset
          </button>
        </div>

        <p class="text-[11px] text-slate-500">
          Showing <span class="font-medium text-slate-700">{{ filtered.length }}</span> of
          <span class="font-medium text-slate-700">{{ findings.length }}</span> findings. Severity reflects potential impact — not proof of
          exploitability.
        </p>

        <!-- ─── Findings list ───────────────────────────── -->
        <div v-if="filtered.length" class="space-y-3">
          <article
            v-for="finding in filtered"
            :key="finding.id"
            class="group relative overflow-hidden rounded-xl border border-slate-200 border-l-2 bg-white p-4 transition-all duration-300 hover:shadow-md hover:shadow-slate-200/50"
            :class="severityMeta(finding.severity).border"
          >
            <!-- Subtle corner glow -->
            <div class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-lime-400/5 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div class="relative flex flex-wrap items-start justify-between gap-2">
              <div class="flex min-w-0 items-start gap-2.5">
                <!-- Pulsing severity dot -->
                <span class="mt-1.5 flex h-2 w-2 shrink-0">
                  <span class="h-2 w-2 rounded-full ring-2 ring-current/20" :class="severityMeta(finding.severity).dot" />
                </span>
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold leading-snug text-gray-900">{{ finding.title }}</h3>
                  <div class="mt-2 flex flex-wrap items-center gap-1.5">
                    <span class="badge badge-sm border-0 text-[10px] font-semibold" :class="severityMeta(finding.severity).badge">
                      {{ severityMeta(finding.severity).label }}
                    </span>
                    <span class="chip">{{ kindLabel(finding.kind) }}</span>
                    <span class="chip">{{ categoryLabel(finding.category) }}</span>
                    <span
                      class="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] transition-transform duration-300 group-hover:scale-[1.03]"
                      :class="CONFIDENCE_CLASSES[finding.confidence] || CONFIDENCE_CLASSES.medium"
                    >
                      {{ finding.confidence || 'medium' }} confidence
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p class="relative mt-3 text-[13px] leading-relaxed text-slate-600">{{ finding.description }}</p>

            <p
              v-if="finding.affectedUrl"
              class="relative mt-2 truncate rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-500"
              :title="finding.affectedUrl"
            >
              {{ finding.affectedUrl }}
            </p>

            <details class="details-group relative mt-3">
              <summary class="flex w-full cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-slate-500 transition-colors duration-300 hover:text-lime-700">
                <ChevronDown :size="14" class="transition-transform duration-300 group-open:rotate-180" />
                Evidence &amp; recommended fix
              </summary>
              <div class="details-content mt-2.5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p class="eyebrow">Evidence</p>
                  <pre class="code-block mt-1.5">{{ finding.evidence || 'No additional evidence recorded.' }}</pre>
                </div>
                <div>
                  <p class="eyebrow">Recommendation</p>
                  <p class="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                    {{ finding.recommendation || 'No remediation is required for this observation.' }}
                  </p>
                </div>
              </div>
            </details>
          </article>
        </div>

        <!-- ─── No match state ──────────────────────────── -->
        <div v-else class="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
          <p class="text-sm text-slate-600">No findings match these filters.</p>
          <button
            type="button"
            class="btn btn-ghost btn-sm mt-2 gap-1.5 text-lime-700 transition-colors hover:bg-lime-100 hover:text-lime-800"
            @click="resetFilters"
          >
            <X :size="13" />
            Clear filters
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Smooth expand for details content */
.details-content {
  animation: revealContent 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes revealContent {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Chevron animation target — Vue doesn't see `group` in scoped, so we hook on native details[open] */
.details-group[open] summary svg {
  transform: rotate(180deg);
}
</style>
