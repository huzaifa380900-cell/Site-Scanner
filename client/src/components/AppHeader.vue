<script setup>
import { computed } from 'vue'
import { Database, ScanSearch } from 'lucide-vue-next'

const props = defineProps({
  health: { type: Object, default: null },
  healthLoading: { type: Boolean, default: false },
  healthError: { type: Boolean, default: false },
})

const relation = computed(() => {
  if (props.healthError) {
    return {
      label: 'API unreachable',
      detail: 'The backend API cannot be reached. Start the server and refresh.',
      dot: 'bg-rose-400',
      text: 'text-rose-300',
      box: 'border-rose-400/25 bg-rose-500/10',
    }
  }
  if (!props.health) {
    return {
      label: 'Checking connection…',
      detail: 'Checking API and database connectivity.',
      dot: 'bg-slate-400 animate-pulse',
      text: 'text-slate-400',
      box: 'border-white/10 bg-white/[0.03]',
    }
  }
  if (props.health.database?.connected) {
    return {
      label: 'API & database online',
      detail: 'The API is responding and MongoDB reports a connected state.',
      dot: 'bg-emerald-400',
      text: 'text-emerald-300',
      box: 'border-emerald-400/20 bg-emerald-500/10',
    }
  }
  return {
    label: 'API online · database offline',
    detail: 'The API is responding but MongoDB is not connected. Scans cannot be saved.',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    box: 'border-amber-400/25 bg-amber-500/10',
  }
})

const detail = computed(() => {
  const version = props.health?.version ? `API v${props.health.version}. ` : ''
  return `${version}${relation.value.detail}`
})
</script>

<template>
  <header
    class="group/header sticky top-0 z-30 border-b border-white/[0.06] bg-[#070d19]/80 backdrop-blur-xl"
  >
    <!-- Decorative layer (clipped so tooltips stay visible) -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <!-- Animated top shimmer line -->
      <div class="shimmer-line absolute inset-x-0 top-0 h-px" />
      <!-- Ambient glows -->
      <div class="absolute -top-20 left-[12%] h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
      <div
        class="absolute -top-20 right-[12%] h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl animate-pulse"
        style="animation-delay: 1.5s"
      />
    </div>

    <div
      class="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
    >
      <!-- ─── Brand ─────────────────────────────────────── -->
      <div class="flex items-center gap-3">
        <div class="relative">
          <!-- Glow halo -->
          <div
            class="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 opacity-50 blur-md transition-opacity duration-500 group-hover/header:opacity-90"
          />
          <!-- Icon tile -->
          <div
            class="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-indigo-500/10 shadow-lg shadow-cyan-500/20 transition-transform duration-500 group-hover/header:scale-105"
          >
            <ScanSearch
              :size="20"
              class="text-cyan-300 transition-transform duration-700 group-hover/header:rotate-[18deg]"
            />
          </div>
        </div>

        <div class="leading-tight">
          <h1
            class="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-base font-semibold tracking-tight text-transparent sm:text-lg"
          >
            Site Scanner
          </h1>
          <p class="text-[11px] text-slate-400 sm:text-xs">
            Website Analysis &amp; Intelligence
          </p>
        </div>
      </div>

      <!-- ─── Right cluster ─────────────────────────────── -->
      <div class="flex items-center gap-2">
        <!-- Passive badge -->
        <span
          class="group/badge hidden items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-400 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-slate-300 sm:inline-flex"
        >
          <Database
            :size="13"
            class="transition-colors duration-300 group-hover/badge:text-cyan-300"
          />
          Passive analysis only
        </span>

        <!-- Live status pill -->
        <div class="tooltip tooltip-bottom" :data-tip="detail">
          <div
            class="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition-all duration-300 hover:scale-[1.03]"
            :class="[relation.box, relation.text]"
            role="status"
            aria-live="polite"
          >
            <span class="relative flex h-2 w-2">
              <span
                v-if="health?.database?.connected"
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]"
                :class="relation.dot"
              />
            </span>
            <span class="max-w-[190px] truncate sm:max-w-none">
              {{ relation.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.shimmer-line {
  background-image: linear-gradient(
    90deg,
    transparent,
    rgba(34, 211, 238, 0.75),
    transparent
  );
  background-size: 200% 100%;
  animation: shimmerBorder 4s ease-in-out infinite;
}

@keyframes shimmerBorder {
  0%,
  100% {
    background-position: 200% 0;
  }
  50% {
    background-position: -200% 0;
  }
}
</style>
