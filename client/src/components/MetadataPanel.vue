<script setup>
import { computed } from 'vue'
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Link2,
  Server,
  ShieldCheck,
  Type,
  XCircle,
} from 'lucide-vue-next'
import {
  formatBytes,
  formatDuration,
  statusCodeTone,
  truncate,
} from '../utils/formatters.js'

const props = defineProps({
  report: { type: Object, required: true },
})

const page = computed(() => props.report.pageMetadata || {})
const security = computed(() => props.report.security || {})
const headers = computed(() => props.report.httpHeaders || {})
const redirects = computed(() => props.report.redirects || [])
const linkChecks = computed(() => page.value.linkChecks || null)

const metaRows = computed(() => [
  { label: 'Page title', value: page.value.title },
  { label: 'Meta description', value: page.value.metaDescription },
  { label: 'Canonical URL', value: page.value.canonical, link: true },
  { label: 'HTML language', value: page.value.lang },
  { label: 'Viewport', value: page.value.viewport, mono: true },
  { label: 'Generator', value: page.value.generator, mono: true },
  { label: 'Robots', value: page.value.metaRobots, mono: true },
  { label: 'Charset', value: page.value.charset, mono: true },
])

const socialRows = computed(() =>
  [
    { label: 'Open Graph title', value: page.value.social?.ogTitle },
    { label: 'Open Graph description', value: page.value.social?.ogDescription },
    { label: 'Twitter card', value: page.value.social?.twitterCard },
  ].filter((row) => row.value),
)

const headingCounts = computed(() =>
  Object.entries(page.value.headingStructure?.counts || { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 }),
)

const outline = computed(() => page.value.headingStructure?.outline || [])

const securityChecks = computed(() => [
  {
    label: 'HTTPS',
    ok: security.value.https === true,
    detail: security.value.https ? 'Final page served over HTTPS' : 'Final page served over plain HTTP',
  },
  {
    label: 'Content-Security-Policy',
    ok: security.value.csp?.present === true,
    detail: security.value.csp?.present
      ? `Present${security.value.csp.hasUnsafeInline ? ' · allows unsafe-inline' : ''}${security.value.csp.hasUnsafeEval ? ' · allows unsafe-eval' : ''}`
      : 'No CSP header observed',
  },
  {
    label: 'Strict-Transport-Security',
    ok: security.value.hsts?.present === true,
    detail: security.value.hsts?.present ? security.value.hsts.value : 'No HSTS header observed',
  },
  {
    label: 'X-Content-Type-Options',
    ok: Boolean(security.value.xContentTypeOptions),
    detail: security.value.xContentTypeOptions || 'Not set',
  },
  {
    label: 'Referrer-Policy',
    ok: Boolean(security.value.referrerPolicy),
    detail: security.value.referrerPolicy || 'Not set',
  },
  {
    label: 'Permissions-Policy',
    ok: Boolean(security.value.permissionsPolicy),
    detail: security.value.permissionsPolicy || 'Not set',
  },
  {
    label: 'Framing protection',
    ok: security.value.framingProtection && security.value.framingProtection !== 'none',
    detail:
      security.value.framingProtection === 'x-frame-options'
        ? security.value.xFrameOptions || 'X-Frame-Options present'
        : security.value.framingProtection === 'csp-frame-ancestors'
          ? 'CSP frame-ancestors present'
          : 'No X-Frame-Options or frame-ancestors directive',
  },
])

const keyHeaders = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-frame-options',
  'content-type',
  'cache-control',
  'server',
  'x-powered-by',
]

const keyHeaderRows = computed(() =>
  keyHeaders.map((key) => ({
    key,
    value: headers.value[key] || null,
  })),
)

const allHeaders = computed(() => Object.entries(headers.value).sort(([a], [b]) => a.localeCompare(b)))
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
      <header class="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <FileText :size="15" class="text-slate-400" />
        <h3 class="text-sm font-medium text-slate-200">Page &amp; metadata</h3>
      </header>
      <div class="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
        <div v-for="row in metaRows" :key="row.label" class="min-w-0">
          <p class="eyebrow">{{ row.label }}</p>
          <a
            v-if="row.value && row.link"
            :href="row.value"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="mt-1 inline-flex max-w-full items-center gap-1 break-all text-xs text-cyan-300 hover:underline"
          >
            <span class="truncate">{{ truncate(row.value, 80) }}</span>
            <ExternalLink :size="10" class="shrink-0" />
          </a>
          <p
            v-else-if="row.value"
            class="mt-1 break-words text-xs leading-relaxed text-slate-300"
            :class="row.mono ? 'font-mono text-[11px]' : ''"
            :title="row.value"
          >
            {{ row.value }}
          </p>
          <p v-else class="mt-1 text-xs text-slate-600">Not set</p>
        </div>
      </div>
      <div v-if="socialRows.length" class="grid gap-x-6 gap-y-3 border-t border-white/[0.05] p-4 sm:grid-cols-2">
        <div v-for="row in socialRows" :key="row.label" class="min-w-0">
          <p class="eyebrow">{{ row.label }}</p>
          <p class="mt-1 break-words text-xs text-slate-300">{{ row.value }}</p>
        </div>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
        <header class="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <Type :size="15" class="text-slate-400" />
          <h3 class="text-sm font-medium text-slate-200">Heading structure</h3>
        </header>
        <div class="p-4">
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="[level, count] in headingCounts"
              :key="level"
              class="chip font-mono"
              :class="count === 0 ? 'text-slate-600' : 'text-slate-300'"
            >
              {{ level.toUpperCase() }}: {{ count }}
            </span>
          </div>
          <div v-if="outline.length" class="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
            <div v-for="(heading, index) in outline" :key="index" class="flex items-start gap-2">
              <span class="mt-0.5 w-7 shrink-0 rounded bg-white/[0.04] px-1 py-0.5 text-center font-mono text-[10px] text-slate-500">
                {{ heading.level.toUpperCase() }}
              </span>
              <p class="min-w-0 break-words text-xs text-slate-300">{{ truncate(heading.text, 120) }}</p>
            </div>
          </div>
          <p v-else class="mt-3 text-xs text-slate-500">No headings were found in the document.</p>
          <p v-if="page.headingStructure?.total > outline.length" class="mt-2 text-[11px] text-slate-600">
            Showing {{ outline.length }} of {{ page.headingStructure.total }} headings.
          </p>
        </div>
      </section>

      <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
        <header class="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <ImageIcon :size="15" class="text-slate-400" />
          <h3 class="text-sm font-medium text-slate-200">Images &amp; links</h3>
        </header>
        <div class="p-4">
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg border border-white/[0.05] bg-[#070d19]/60 p-3">
              <p class="text-[10px] uppercase tracking-wide text-slate-500">Images</p>
              <p class="mt-1 text-lg font-semibold tabular text-slate-100">{{ page.images?.total ?? 0 }}</p>
              <p class="text-[11px]" :class="page.images?.missingAlt ? 'text-amber-300' : 'text-slate-500'">
                {{ page.images?.missingAlt ?? 0 }} missing alt
              </p>
            </div>
            <div class="rounded-lg border border-white/[0.05] bg-[#070d19]/60 p-3">
              <p class="text-[10px] uppercase tracking-wide text-slate-500">Links</p>
              <p class="mt-1 text-lg font-semibold tabular text-slate-100">{{ page.links?.total ?? 0 }}</p>
              <p class="text-[11px] text-slate-500">
                {{ page.links?.internalCount ?? 0 }} internal · {{ page.links?.externalCount ?? 0 }} external
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
            <span class="chip">Iframes: {{ page.iframes?.count ?? 0 }}</span>
            <span class="chip">Forms: {{ page.forms?.count ?? 0 }}</span>
            <span v-if="page.forms?.insecureActionCount" class="chip border-rose-400/20 text-rose-300">
              {{ page.forms.insecureActionCount }} insecure form action(s)
            </span>
            <span class="chip">Scripts: {{ page.scripts?.externalCount ?? 0 }} external</span>
            <span class="chip">Styles: {{ page.styles?.externalCount ?? 0 }} external</span>
          </div>

          <div class="mt-3 border-t border-white/[0.05] pt-3">
            <p class="eyebrow">Internal link check</p>
            <template v-if="linkChecks && linkChecks.checked > 0">
              <p class="mt-1 text-[11px] text-slate-400">
                Checked {{ linkChecks.checked }} of {{ linkChecks.candidates }} discovered internal link(s)
                <span v-if="linkChecks.skipped"> · {{ linkChecks.skipped }} skipped</span>.
              </p>
              <ul v-if="linkChecks.broken?.length" class="mt-2 space-y-1">
                <li v-for="(broken, index) in linkChecks.broken" :key="index" class="break-all font-mono text-[10px] text-rose-300">
                  {{ truncate(broken.url, 80) }} → {{ broken.statusCode ? `HTTP ${broken.statusCode}` : broken.error }}
                </li>
              </ul>
              <p v-else class="mt-1.5 text-[11px] text-emerald-300/80">All checked internal links responded successfully.</p>
            </template>
            <p v-else class="mt-1 text-[11px] text-slate-500">
              Link checking was limited or not run for this scan. No broken-link conclusions are made.
            </p>
          </div>

          <div v-if="page.images?.missingAltExamples?.length" class="mt-3">
            <p class="eyebrow">Images without alt (examples)</p>
            <ul class="mt-1.5 space-y-1">
              <li v-for="(src, index) in page.images.missingAltExamples" :key="index" class="truncate font-mono text-[10px] text-slate-500" :title="src">
                {{ src }}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div class="flex items-center gap-2">
          <Globe :size="15" class="text-slate-400" />
          <h3 class="text-sm font-medium text-slate-200">HTTP response</h3>
        </div>
        <span class="badge badge-sm border px-2 py-2 font-semibold" :class="statusCodeTone(report.httpStatus)">
          {{ report.httpStatus ?? '—' }}
        </span>
      </header>
      <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="eyebrow">Content type</p>
          <p class="mt-1 break-all font-mono text-[11px] text-slate-300">{{ headers['content-type'] || '—' }}</p>
        </div>
        <div>
          <p class="eyebrow">Response time</p>
          <p class="mt-1 text-sm tabular text-slate-200">{{ formatDuration(report.pageMetadata?.responseTimeMs ?? report.durationMs) }}</p>
        </div>
        <div>
          <p class="eyebrow">TTFB</p>
          <p class="mt-1 text-sm tabular text-slate-200">{{ formatDuration(report.pageMetadata?.ttfbMs) }}</p>
        </div>
        <div>
          <p class="eyebrow">Response size</p>
          <p class="mt-1 text-sm tabular text-slate-200">{{ formatBytes(report.pageMetadata?.bodyBytes) }}</p>
        </div>
      </div>

      <div class="border-t border-white/[0.05] p-4">
        <p class="eyebrow">Redirect chain ({{ redirects.length }})</p>
        <ol v-if="redirects.length" class="mt-2 space-y-2">
          <li v-for="(hop, index) in redirects" :key="index" class="rounded-lg border border-white/[0.05] bg-[#070d19]/60 p-2.5 text-[11px]">
            <span class="mr-1.5 rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{{ hop.statusCode }}</span>
            <span class="break-all font-mono text-slate-400">{{ hop.from }}</span>
            <span class="mx-1 text-slate-600">→</span>
            <span class="break-all font-mono text-slate-300">{{ hop.to }}</span>
          </li>
        </ol>
        <p v-else class="mt-1 text-xs text-slate-500">No redirects were followed.</p>
      </div>
    </section>

    <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
      <header class="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <ShieldCheck :size="15" class="text-slate-400" />
        <h3 class="text-sm font-medium text-slate-200">Security-header observations</h3>
      </header>
      <div class="grid gap-2 p-4 sm:grid-cols-2">
        <div
          v-for="check in securityChecks"
          :key="check.label"
          class="flex items-start gap-2.5 rounded-lg border border-white/[0.05] bg-[#070d19]/50 p-3"
        >
          <CheckCircle2 v-if="check.ok" :size="15" class="mt-0.5 shrink-0 text-emerald-400" />
          <XCircle v-else :size="15" class="mt-0.5 shrink-0 text-slate-600" />
          <div class="min-w-0">
            <p class="text-xs font-medium text-slate-200">{{ check.label }}</p>
            <p class="mt-0.5 break-words text-[11px] text-slate-500" :title="check.detail">{{ truncate(check.detail, 110) }}</p>
          </div>
        </div>
      </div>
      <p class="border-t border-white/[0.05] px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        Missing headers are configuration observations and recommendations. They are not, on their own, proof of an
        exploitable vulnerability. This scan performs no exploitation or intrusive testing.
      </p>
    </section>

    <section class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
      <header class="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <Server :size="15" class="text-slate-400" />
        <h3 class="text-sm font-medium text-slate-200">Response headers</h3>
      </header>
      <div class="p-4">
        <dl class="space-y-2">
          <div v-for="row in keyHeaderRows" :key="row.key" class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <dt class="w-56 shrink-0 font-mono text-[11px] text-slate-500">{{ row.key }}</dt>
            <dd class="min-w-0 break-all font-mono text-[11px]" :class="row.value ? 'text-slate-300' : 'text-slate-600'">
              {{ row.value ? truncate(row.value, 140) : 'not set' }}
            </dd>
          </div>
        </dl>
        <details class="group mt-4">
          <summary class="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-cyan-300">
            <ChevronDown :size="14" class="transition-transform group-open:rotate-180" />
            All {{ allHeaders.length }} response headers
          </summary>
          <div class="mt-2 max-h-72 overflow-auto rounded-lg border border-white/[0.05]">
            <table class="table table-xs w-full">
              <thead>
                <tr class="border-white/[0.06] text-[10px] uppercase tracking-wide text-slate-500">
                  <th class="bg-transparent font-medium">Header</th>
                  <th class="bg-transparent font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="[key, value] in allHeaders" :key="key" class="border-white/[0.05] align-top">
                  <td class="whitespace-nowrap font-mono text-[11px] text-slate-500">{{ key }}</td>
                  <td class="break-all font-mono text-[11px] text-slate-300">{{ truncate(value, 220) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
