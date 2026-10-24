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
  <header class="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070d19]/85 backdrop-blur-md">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
          <ScanSearch :size="20" class="text-cyan-300" />
        </div>
        <div class="leading-tight">
          <h1 class="text-base font-semibold tracking-tight text-white sm:text-lg">Site Scanner</h1>
          <p class="text-[11px] text-slate-400 sm:text-xs">Website Analysis &amp; Intelligence</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="hidden items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-400 sm:inline-flex">
          <Database :size="13" />
          Passive analysis only
        </span>
        <div class="tooltip tooltip-bottom" :data-tip="detail">
          <div
            class="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
            :class="[relation.box, relation.text]"
            role="status"
            aria-live="polite"
          >
            <span class="relative flex h-2 w-2">
              <span
                v-if="health?.database?.connected"
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50"
              />
              <span class="relative inline-flex h-2 w-2 rounded-full" :class="relation.dot" />
            </span>
            <span class="max-w-[190px] truncate sm:max-w-none">{{ relation.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
