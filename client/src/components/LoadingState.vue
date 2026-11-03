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
  <section
    class="panel panel-body animate-fade-up relative overflow-hidden"
    aria-live="polite"
    aria-busy="true"
  >
    <!-- ─── Ambient background layer ───────────────────── -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <!-- Top shimmer -->
      <div class="shimmer-line absolute inset-x-0 top-0 h-px" />
      <!-- Corner glows -->
      <div class="absolute -top-24 -left-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl animate-pulse" />
      <div
        class="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl animate-pulse"
        style="animation-delay: 1.2s"
      />
      <!-- Sweeping scan beam -->
      <div class="scan-beam absolute inset-y-0 -left-1/3 w-1/3" />
    </div>

    <!-- ─── Header row ────────────────────────────────── -->
    <div class="relative flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <!-- Animated icon tile -->
        <div class="relative">
          <div class="absolute inset-0 rounded-xl bg-cyan-400/40 blur-md animate-pulse" />
          <span
            class="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-indigo-500/10 shadow-lg shadow-cyan-500/20"
          >
            <Loader2 :size="20" class="animate-spin text-cyan-300" />
          </span>
        </div>

        <div>
          <p class="text-sm font-semibold text-white">
            Scanning
            <span class="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              {{ hostnameOf(url) }}
            </span>
          </p>
          <p class="text-xs text-slate-400">
            Running passive HTTP, HTML, technology and browser checks.
            <span class="tabular ml-1 inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-cyan-200">
              <span class="h-1 w-1 animate-pulse rounded-full bg-cyan-400" />
              {{ seconds }}s elapsed
            </span>
          </p>
        </div>
      </div>

      <span class="chip border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200 transition-colors duration-300 hover:bg-cyan-400/[0.1]">
        <ShieldCheck :size="13" />
        Network policy enforced
      </span>
    </div>

    <!-- ─── Animated progress bar ─────────────────────── -->
    <div class="relative mt-5">
      <div class="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <!-- Base indeterminate fill -->
        <div class="indeterminate-bar absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-indigo-400" />
        <!-- Shimmer overlay -->
        <div class="shimmer-overlay absolute inset-0" />
      </div>
      <!-- Glow under bar -->
      <div class="absolute inset-x-0 -bottom-1 h-2 bg-gradient-to-r from-cyan-500/0 via-cyan-500/30 to-indigo-500/0 blur-md" />
    </div>

    <!-- ─── Info cards ────────────────────────────────── -->
    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <!-- In progress -->
      <div class="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-300 hover:border-cyan-400/20 hover:bg-white/[0.03]">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <p class="eyebrow">In progress</p>
        <ul class="mt-3 space-y-2.5 text-sm text-slate-300">
          <li class="step-in flex items-center gap-2.5" style="animation-delay: 0ms">
            <span class="relative flex h-2 w-2 shrink-0">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            Fetching the main document and response headers
          </li>
          <li class="step-in flex items-center gap-2.5" style="animation-delay: 150ms">
            <span class="relative flex h-2 w-2 shrink-0">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/80 opacity-60" style="animation-delay: 0.4s" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-cyan-400/80" />
            </span>
            Parsing HTML, metadata, links and assets
          </li>
          <li class="step-in flex items-center gap-2.5" style="animation-delay: 300ms">
            <span class="relative flex h-2 w-2 shrink-0">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/60 opacity-60" style="animation-delay: 0.8s" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-cyan-400/60" />
            </span>
            Running headless Chromium through the egress guard
          </li>
        </ul>
      </div>

      <!-- What happens next -->
      <div class="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-300 hover:border-indigo-400/20 hover:bg-white/[0.03]">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <p class="eyebrow">What happens next</p>
        <p class="mt-3 text-sm leading-relaxed text-slate-400">
          The API builds findings from real observations, saves the report in MongoDB, then returns it here. This can take
          up to about <span class="font-medium text-slate-300">30 seconds</span> depending on the website.
        </p>
      </div>
    </div>

    <!-- ─── Footer note ───────────────────────────────── -->
    <p class="relative mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">
      <Info :size="12" class="shrink-0 text-slate-600" />
      You can leave this open — the result is only shown after the backend confirms the saved report.
    </p>
  </section>
</template>

<style scoped>
/* ─── Top shimmer ──────────────────────────── */
.shimmer-line {
  background-image: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.75), transparent);
  background-size: 200% 100%;
  animation: shimmerBorder 4s ease-in-out infinite;
}
@keyframes shimmerBorder {
  0%, 100% { background-position: 200% 0; }
  50% { background-position: -200% 0; }
}

/* ─── Sweeping scan beam ───────────────────── */
.scan-beam {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(34, 211, 238, 0.06),
    rgba(99, 102, 241, 0.08),
    transparent
  );
  animation: scanSweep 5s ease-in-out infinite;
}
@keyframes scanSweep {
  0% { transform: translateX(0); }
  100% { transform: translateX(400%); }
}

/* ─── Indeterminate progress ───────────────── */
.indeterminate-bar {
  animation: indeterminate 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.5);
}
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* ─── Shimmer over progress ────────────────── */
.shimmer-overlay {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmerOverlay 2s linear infinite;
}
@keyframes shimmerOverlay {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Staggered step reveal ────────────────── */
.step-in {
  opacity: 0;
  animation: stepReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes stepReveal {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
