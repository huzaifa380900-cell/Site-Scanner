<script setup>
import { onUnmounted, ref } from 'vue'
import { Loader2, ShieldCheck } from 'lucide-vue-next'
import { hostnameOf } from '../utils/formatters.js'

defineProps({
  url: { type: String, default: '' },
})

const seconds = ref(0)
const timer = setInterval(() => {
  seconds.value += 1
}, 1000)

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <section class="panel panel-body animate-fade-up" aria-live="polite" aria-busy="true">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
          <Loader2 :size="20" class="animate-spin text-cyan-300" />
        </span>
        <div>
          <p class="text-sm font-semibold text-white">Scanning {{ hostnameOf(url) }}</p>
          <p class="text-xs text-slate-400">
            Running passive HTTP, HTML, technology and browser checks.
            <span class="tabular">{{ seconds }}s elapsed</span>
          </p>
        </div>
      </div>
      <span class="chip border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200">
        <ShieldCheck :size="13" />
        Network policy enforced
      </span>
    </div>

    <progress class="progress progress-primary mt-5 w-full"></progress>

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p class="eyebrow">In progress</p>
        <ul class="mt-3 space-y-2.5 text-sm text-slate-300">
          <li class="flex items-center gap-2.5">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            Fetching the main document and response headers
          </li>
          <li class="flex items-center gap-2.5">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400/80" />
            Parsing HTML, metadata, links and assets
          </li>
          <li class="flex items-center gap-2.5">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400/60" />
            Running headless Chromium through the egress guard
          </li>
        </ul>
      </div>
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p class="eyebrow">What happens next</p>
        <p class="mt-3 text-sm leading-relaxed text-slate-400">
          The API builds findings from real observations, saves the report in MongoDB, then returns it here. This can take
          up to about 30 seconds depending on the website.
        </p>
      </div>
    </div>

    <p class="mt-4 text-[11px] text-slate-500">
      You can leave this open — the result is only shown after the backend confirms the saved report.
    </p>
  </section>
</template>
