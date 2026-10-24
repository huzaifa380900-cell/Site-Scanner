<script setup>
import { computed } from 'vue'
import {
  AlertTriangle,
  Ban,
  Bug,
  CheckCircle2,
  Globe,
  ImageOff,
  Info,
  Terminal,
} from 'lucide-vue-next'
import { formatDuration, statusCodeTone, truncate } from '../utils/formatters.js'

const props = defineProps({
  report: { type: Object, required: true },
})

const browser = computed(() => props.report.browser || {})
const completed = computed(() => browser.value.status === 'completed')
const consoleErrors = computed(() => (props.report.browserErrors || []).filter((item) => item.type === 'console'))
const pageErrors = computed(() => (props.report.browserErrors || []).filter((item) => item.type === 'pageerror'))
const failedRequests = computed(() => props.report.failedResources || [])
const timing = computed(() => browser.value.navigationTiming || null)
const policy = computed(() => browser.value.policy || null)

const resources = computed(() => browser.value.resources || { images: {}, stylesheets: {} })
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="!completed"
      class="flex items-start gap-3 rounded-xl border p-4"
      :class="browser.status === 'failed' ? 'border-amber-400/25 bg-amber-500/10' : 'border-white/[0.08] bg-white/[0.02]'"
    >
      <AlertTriangle :size="18" class="mt-0.5 shrink-0 text-amber-300" />
      <div>
        <p class="text-sm font-medium text-slate-100">
          {{ browser.status === 'failed' ? 'Browser checks failed' : 'Browser checks were skipped' }}
        </p>
        <p class="mt-1 text-xs leading-relaxed text-slate-400">
          {{ browser.error?.message || 'Chromium did not complete this analysis.' }}
          <span v-if="browser.error?.code" class="ml-1 font-mono text-[11px] text-slate-500">({{ browser.error.code }})</span>
        </p>
        <p class="mt-1.5 text-[11px] text-slate-500">
          HTTP and HTML observations in this report are still valid; runtime errors and resource outcomes are unknown.
        </p>
      </div>
    </div>

    <div v-else class="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
      <CheckCircle2 :size="18" class="mt-0.5 shrink-0 text-emerald-300" />
      <div>
        <p class="text-sm font-medium text-slate-100">Headless Chromium completed the visit</p>
        <p class="mt-1 text-xs leading-relaxed text-slate-400">
          The browser loaded the page through the enforcing egress proxy. Runtime errors and failed resources are listed
          below. No interactions, form submissions or logins were attempted.
        </p>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p class="text-[11px] uppercase tracking-wide text-slate-500">Main document</p>
        <p class="mt-1.5">
          <span class="badge badge-lg border px-2.5 py-3 text-base font-semibold" :class="statusCodeTone(browser.mainStatus)">
            {{ browser.mainStatus ?? '—' }}
          </span>
        </p>
        <p class="mt-1 text-[11px] text-slate-500">{{ browser.mainDocumentOk ? 'Browser received a successful response' : 'Browser did not receive a 2xx response' }}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p class="text-[11px] uppercase tracking-wide text-slate-500">Page title in browser</p>
        <p class="mt-1.5 truncate text-sm font-medium text-slate-100" :title="browser.title">{{ browser.title || '—' }}</p>
        <p class="mt-1 text-[11px] text-slate-500">Final URL after redirects</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p class="text-[11px] uppercase tracking-wide text-slate-500">Browser</p>
        <p class="mt-1.5 text-sm font-medium text-slate-100">Chromium {{ browser.browserVersion || '' }}</p>
        <p class="mt-1 text-[11px] capitalize text-slate-500">Status: {{ browser.status || 'unknown' }}</p>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p class="text-[11px] uppercase tracking-wide text-slate-500">Navigation timing</p>
        <dl class="mt-1.5 space-y-1 text-xs">
          <div class="flex justify-between gap-2"><dt class="text-slate-500">DOM content</dt><dd class="tabular text-slate-200">{{ timing ? formatDuration(timing.domContentLoadedMs) : '—' }}</dd></div>
          <div class="flex justify-between gap-2"><dt class="text-slate-500">Load</dt><dd class="tabular text-slate-200">{{ timing ? formatDuration(timing.loadMs) : '—' }}</dd></div>
          <div class="flex justify-between gap-2"><dt class="text-slate-500">TTFB</dt><dd class="tabular text-slate-200">{{ timing ? formatDuration(timing.ttfbMs) : '—' }}</dd></div>
        </dl>
      </div>
    </div>

    <div class="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-500">
      <Globe :size="13" class="shrink-0" />
      <span class="truncate" :title="browser.finalUrl || report.targetUrl">{{ browser.finalUrl || report.targetUrl }}</span>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
        <header class="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div class="flex items-center gap-2">
            <Terminal :size="15" class="text-slate-400" />
            <h3 class="text-sm font-medium text-slate-200">Console errors</h3>
          </div>
          <span class="badge badge-sm border-0 bg-white/[0.04] text-[10px] text-slate-400">{{ consoleErrors.length }}</span>
        </header>
        <div class="p-4">
          <div v-if="consoleErrors.length" class="space-y-2">
            <div v-for="(item, index) in consoleErrors" :key="index" class="rounded-lg border border-white/[0.05] bg-[#070d19]/70 p-2.5">
              <p class="break-words font-mono text-[11px] leading-relaxed text-rose-200">{{ item.message }}</p>
              <p v-if="item.url" class="mt-1 truncate text-[10px] text-slate-500" :title="item.url">{{ item.url }}</p>
              <span v-if="item.scope === 'third-party'" class="mt-1.5 inline-block rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">third-party</span>
            </div>
          </div>
          <div v-else class="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-emerald-500/[0.04] px-3 py-4 text-xs text-slate-400">
            <CheckCircle2 :size="14" class="text-emerald-400" />
            No console errors were captured in this session.
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
        <header class="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div class="flex items-center gap-2">
            <Bug :size="15" class="text-slate-400" />
            <h3 class="text-sm font-medium text-slate-200">Uncaught page errors</h3>
          </div>
          <span class="badge badge-sm border-0 bg-white/[0.04] text-[10px] text-slate-400">{{ pageErrors.length }}</span>
        </header>
        <div class="p-4">
          <div v-if="pageErrors.length" class="space-y-2">
            <div v-for="(item, index) in pageErrors" :key="index" class="rounded-lg border border-rose-400/15 bg-rose-500/[0.05] p-2.5">
              <p class="break-words font-mono text-[11px] leading-relaxed text-rose-200">{{ item.message }}</p>
              <p v-if="item.url" class="mt-1 truncate text-[10px] text-slate-500" :title="item.url">{{ item.url }}</p>
            </div>
          </div>
          <div v-else class="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-emerald-500/[0.04] px-3 py-4 text-xs text-slate-400">
            <CheckCircle2 :size="14" class="text-emerald-400" />
            No uncaught exceptions were captured in this session.
          </div>
        </div>
      </section>
    </div>

    <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div class="flex items-center gap-2">
          <Ban :size="15" class="text-slate-400" />
          <h3 class="text-sm font-medium text-slate-200">Failed network requests</h3>
        </div>
        <span class="badge badge-sm border-0 bg-white/[0.04] text-[10px] text-slate-400">{{ failedRequests.length }}</span>
      </header>
      <div class="p-4">
        <div v-if="failedRequests.length" class="overflow-x-auto">
          <table class="table table-sm w-full text-[11px]">
            <thead>
              <tr class="border-white/[0.06] text-[10px] uppercase tracking-wide text-slate-500">
                <th class="bg-transparent font-medium">Resource</th>
                <th class="bg-transparent font-medium">Type</th>
                <th class="bg-transparent font-medium">Scope</th>
                <th class="bg-transparent font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in failedRequests" :key="index" class="border-white/[0.05]">
                <td class="max-w-[280px] truncate font-mono text-slate-300" :title="item.url">{{ truncate(item.url, 90) }}</td>
                <td class="text-slate-400">{{ item.resourceType || '—' }}</td>
                <td>
                  <span class="rounded px-1.5 py-0.5 text-[10px]" :class="item.scope === 'same-origin' ? 'bg-sky-500/10 text-sky-300' : 'bg-white/[0.04] text-slate-400'">
                    {{ item.scope || 'unknown' }}
                  </span>
                </td>
                <td>
                  <span v-if="item.blockedByPolicy" class="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                    blocked by policy
                  </span>
                  <span v-else class="text-slate-400">{{ item.errorText || 'failed' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-emerald-500/[0.04] px-3 py-4 text-xs text-slate-400">
          <CheckCircle2 :size="14" class="text-emerald-400" />
          No failed network requests were observed during the browser session.
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-white/[0.05] bg-[#070d19]/60 p-3">
            <div class="flex items-center gap-2 text-xs text-slate-400"><ImageOff :size="14" /> Images</div>
            <p class="mt-1.5 text-sm text-slate-200">
              {{ resources.images?.seen ?? 0 }} requested ·
              <span :class="resources.images?.failed ? 'text-rose-300' : 'text-slate-400'">{{ resources.images?.failed ?? 0 }} failed</span>
            </p>
          </div>
          <div class="rounded-lg border border-white/[0.05] bg-[#070d19]/60 p-3">
            <div class="flex items-center gap-2 text-xs text-slate-400"><Globe :size="14" /> Stylesheets</div>
            <p class="mt-1.5 text-sm text-slate-200">
              {{ resources.stylesheets?.seen ?? 0 }} requested ·
              <span :class="resources.stylesheets?.failed ? 'text-rose-300' : 'text-slate-400'">{{ resources.stylesheets?.failed ?? 0 }} failed</span>
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
      <div class="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <Info :size="14" class="mt-0.5 shrink-0" />
        <div>
          <p>
            <span class="text-slate-400">Limitations:</span> a single automated visit cannot prove a website is bug-free.
            WebSockets, protocol upgrades, downloads, popups and service workers are blocked during scans, so sites that
            depend on them may log expected connection failures. Third-party tracker failures are reported separately from
            same-origin errors.
          </p>
          <p v-if="policy" class="mt-2">
            Enforced policy: request interception {{ policy.requestInterception ? 'on' : 'off' }}, egress proxy
            {{ policy.egressProxy ? 'on' : 'off' }}, WebSockets {{ policy.webSockets }}, service workers
            {{ policy.serviceWorkers }}.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
