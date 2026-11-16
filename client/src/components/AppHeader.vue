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
      dot: 'bg-rose-500',
      text: 'text-rose-700',
      box: 'border-rose-300 bg-rose-50',
    }
  }
  if (!props.health) {
    return {
      label: 'Checking connection…',
      detail: 'Checking API and database connectivity.',
      dot: 'bg-slate-400 animate-pulse',
      text: 'text-slate-600',
      box: 'border-slate-200 bg-slate-50',
    }
  }
  if (props.health.database?.connected) {
    return {
      label: 'API & database online',
      detail: 'The API is responding and MongoDB reports a connected state.',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      box: 'border-emerald-300 bg-emerald-50',
    }
  }
  return {
    label: 'API online · database offline',
    detail: 'The API is responding but MongoDB is not connected. Scans cannot be saved.',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    box: 'border-amber-300 bg-amber-50',
  }
})

const detail = computed(() => {
  const version = props.health?.version ? `API v${props.health.version}. ` : ''
  return `${version}${relation.value.detail}`
})
</script>

<template>
  <header
    class="group/header sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl"
  >
    <!-- Decorative layer (clipped so tooltips stay visible) -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <!-- Animated top shimmer line -->
      <div class="shimmer-line absolute inset-x-0 top-0 h-px" />
      <!-- Ambient glows -->
      <div class="absolute -top-20 left-[12%] h-44 w-44 rounded-full bg-lime-400/20 blur-3xl animate-pulse" />
      <div
        class="absolute -top-20 right-[12%] h-44 w-44 rounded-full bg-green-400/15 blur-3xl animate-pulse"
        style="animation-delay: 1.5s"
      />
    </div>

    <div
      class="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
    >
      <!-- ─── Brand ─────────────────────────────────────── -->
      <div class="flex items-center">
        <router-link to="/" class="flex items-center" aria-label="Site Scanner Home">
          <img src="/logo.png" alt="Site Scanner" class="h-8 sm:h-9 md:h-10 w-auto object-contain" />
        </router-link>
      </div>

      <!-- ─── Right cluster ─────────────────────────────── -->
      <div class="flex items-center gap-2">
        <!-- Passive badge -->
        <span
          class="group/badge hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 transition-all duration-300 hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700 sm:inline-flex"
        >
          <Database
            :size="13"
            class="transition-colors duration-300 group-hover/badge:text-lime-600"
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
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60"
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full"
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
    rgba(132, 204, 22, 0.6),
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
