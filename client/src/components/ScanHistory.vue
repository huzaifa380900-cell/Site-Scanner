<script setup>
import { ChevronRight, Database, History, RefreshCw } from 'lucide-vue-next'
import { formatDate, statusCodeTone } from '../utils/formatters.js'

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
  selectedId: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

defineEmits(['refresh', 'select'])

function statusClass(status) {
  return status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
}
</script>

<template>
  <section class="panel overflow-hidden">
    <div class="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
      <div class="flex items-center gap-2">
        <History :size="15" class="text-slate-400" />
        <h2 class="text-sm font-medium text-slate-200">Recent scans</h2>
        <span v-if="items.length" class="badge badge-sm border-0 bg-white/[0.04] text-[10px] text-slate-400">{{ items.length }}</span>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-xs h-7 min-h-0 gap-1 px-1.5 text-slate-400 hover:text-cyan-300"
        :disabled="loading"
        aria-label="Refresh scan history"
        @click="$emit('refresh')"
      >
        <RefreshCw :size="13" :class="loading ? 'animate-spin' : ''" />
      </button>
    </div>

    <div v-if="error" class="p-4">
      <div class="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
        <p class="font-medium">History unavailable</p>
        <p class="mt-1 text-amber-200/80">{{ error.message }}</p>
        <p v-if="error.code === 'DATABASE_UNAVAILABLE'" class="mt-1 text-amber-200/70">
          Connect MongoDB Atlas and confirm via <span class="font-mono">/api/health</span>.
        </p>
      </div>
    </div>

    <div v-else-if="loading && !items.length" class="space-y-2 p-3">
      <div v-for="index in 3" :key="index" class="animate-pulse rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
        <div class="h-3 w-1/2 rounded bg-white/[0.06]"></div>
        <div class="mt-2 h-2.5 w-3/4 rounded bg-white/[0.04]"></div>
      </div>
    </div>

    <div v-else-if="!items.length" class="px-4 py-8 text-center">
      <Database :size="22" class="mx-auto text-slate-600" />
      <p class="mt-2 text-xs font-medium text-slate-300">No saved scans yet</p>
      <p class="mt-1 text-[11px] leading-relaxed text-slate-500">
        Completed reports are stored in MongoDB and will appear here.
      </p>
    </div>

    <ul v-else class="max-h-[420px] space-y-1.5 overflow-y-auto p-2">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="group flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          :class="item.id === selectedId
            ? 'border-cyan-400/40 bg-cyan-400/[0.07]'
            : 'border-transparent hover:border-white/[0.08] hover:bg-white/[0.03]'"
          :disabled="disabled"
          :aria-current="item.id === selectedId ? 'true' : undefined"
          @click="$emit('select', item.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-xs font-medium text-slate-200">{{ item.hostname }}</span>
              <span class="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide" :class="statusClass(item.status)">
                {{ item.status }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500">
              <span>{{ formatDate(item.createdAt) }}</span>
              <span class="rounded border px-1 py-0 font-mono text-[9px]" :class="statusCodeTone(item.httpStatus)">
                {{ item.httpStatus ?? '—' }}
              </span>
              <span>{{ item.findingCount ?? 0 }} findings</span>
              <span v-if="item.observationScore !== null && item.observationScore !== undefined">
                score <span class="font-semibold text-slate-300">{{ item.observationScore }}</span>
              </span>
            </div>
          </div>
          <ChevronRight :size="14" class="shrink-0 text-slate-600 transition-colors group-hover:text-cyan-300" />
        </button>
      </li>
    </ul>

    <div class="border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-slate-600">
      Read-only history · newest first · max 12 shown
    </div>
  </section>
</template>
