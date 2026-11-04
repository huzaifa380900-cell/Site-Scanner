<script setup>
import { AlertTriangle, ChevronRight, Database, History, Lock, RefreshCw, Trash2 } from 'lucide-vue-next'
import { formatDate, statusCodeTone } from '../utils/formatters.js'

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
  actionError: { type: Object, default: null },
  deletingId: { type: String, default: '' },
  selectedId: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh', 'select', 'delete'])

function statusClass(status) {
  return status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
}

function confirmDelete(item) {
  if (window.confirm(`Delete the saved scan for ${item.hostname}? This cannot be undone.`)) {
    emit('delete', item.id)
  }
}
</script>
<template>
  <section class="panel overflow-hidden relative">
    <!-- Ambient accent -->
    <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" aria-hidden="true" />

    <!-- ═══════════════════════════════════════════════
         HEADER
         ═══════════════════════════════════════════════ -->
    <div class="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.01] px-4 py-3">
      <div class="flex items-center gap-2.5">
        <div class="grid h-7 w-7 place-items-center rounded-md border border-cyan-400/20 bg-cyan-500/10">
          <History :size="14" class="text-cyan-300" />
        </div>
        <h2 class="text-sm font-semibold text-slate-200">Recent scans</h2>
        <span
          v-if="items.length"
          class="badge badge-sm border-0 bg-white/[0.05] text-[10px] font-semibold text-slate-400 transition-colors duration-300"
        >{{ items.length }}</span>
      </div>
      <button
        type="button"
        class="group/refresh grid h-7 w-7 place-items-center rounded-md border border-transparent text-slate-400 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="loading"
        aria-label="Refresh scan history"
        @click="$emit('refresh')"
      >
        <RefreshCw :size="13" :class="loading ? 'animate-spin' : 'transition-transform duration-300 group-hover/refresh:rotate-180'" />
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════
         ERROR STATE
         ═══════════════════════════════════════════════ -->
    <div v-if="error" class="p-4">
      <div class="relative overflow-hidden rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
        <div class="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-amber-500/20 blur-2xl" />
        <div class="relative flex items-start gap-2">
          <div class="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-amber-400/30 bg-amber-500/15">
            <AlertTriangle :size="12" class="text-amber-300" />
          </div>
          <div>
            <p class="font-semibold">History unavailable</p>
            <p class="mt-1 text-amber-200/80">{{ error.message }}</p>
            <p v-if="error.code === 'DATABASE_UNAVAILABLE'" class="mt-1 text-amber-200/70">
              Connect MongoDB Atlas and confirm via
              <span class="rounded bg-white/[0.05] px-1 py-0.5 font-mono text-[10px]">/api/health</span>.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════
         LOADING SKELETON
         ═══════════════════════════════════════════════ -->
    <div v-else-if="loading && !items.length" class="space-y-2 p-3">
      <div
        v-for="index in 3"
        :key="index"
        class="relative overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02] p-3"
      >
        <div class="skeleton-shimmer absolute inset-0" />
        <div class="relative h-3 w-1/2 rounded bg-white/[0.06]"></div>
        <div class="relative mt-2 h-2.5 w-3/4 rounded bg-white/[0.04]"></div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════
         EMPTY STATE
         ═══════════════════════════════════════════════ -->
    <div v-else-if="!items.length" class="px-4 py-10 text-center">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <Database :size="20" class="text-slate-500" />
      </div>
      <p class="mt-3 text-xs font-semibold text-slate-300">No scans saved in this browser yet</p>
      <p class="mt-1 max-w-xs mx-auto text-[11px] leading-relaxed text-slate-500">
        Your latest 12 reports appear here. Older reports are deleted automatically.
      </p>
    </div>

    <!-- ═══════════════════════════════════════════════
         LIST
         ═══════════════════════════════════════════════ -->
    <ul v-else class="custom-scroll max-h-[420px] space-y-1.5 overflow-y-auto p-2">
      <li v-for="item in items" :key="item.id" class="flex items-stretch gap-1">
        <button
          type="button"
          class="group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
          :class="
            item.id === selectedId
              ? 'border-cyan-400/40 bg-cyan-400/[0.07] shadow-[0_0_0_1px_rgba(34,211,238,0.12)]'
              : 'border-transparent hover:border-white/[0.1] hover:bg-white/[0.03]'
          "
          :disabled="disabled"
          :aria-current="item.id === selectedId ? 'true' : undefined"
          @click="$emit('select', item.id)"
        >
          <!-- Left accent stripe on active -->
          <span
            v-if="item.id === selectedId"
            class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            aria-hidden="true"
          />

          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span
                class="truncate text-xs font-medium transition-colors duration-300"
                :class="item.id === selectedId ? 'text-white' : 'text-slate-200 group-hover:text-white'"
              >{{ item.hostname }}</span>
              <span
                class="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-transform duration-300 group-hover:scale-105"
                :class="statusClass(item.status)"
              >
                {{ item.status }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500">
              <span>{{ formatDate(item.createdAt) }}</span>
              <span
                class="rounded border px-1 py-0 font-mono text-[9px] font-medium"
                :class="statusCodeTone(item.httpStatus)"
              >
                {{ item.httpStatus ?? '—' }}
              </span>
              <span>{{ item.findingCount ?? 0 }} findings</span>
              <span v-if="item.observationScore !== null && item.observationScore !== undefined">
                score
                <span class="font-semibold text-slate-300">{{ item.observationScore }}</span>
              </span>
            </div>
          </div>
          <ChevronRight
            :size="14"
            class="shrink-0 transition-all duration-300"
            :class="item.id === selectedId ? 'translate-x-0.5 text-cyan-300' : 'text-slate-600 group-hover:translate-x-0.5 group-hover:text-cyan-300'"
          />
        </button>
        <button
          type="button"
          class="grid w-9 shrink-0 place-items-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="disabled || Boolean(deletingId)"
          :aria-label="`Delete scan for ${item.hostname}`"
          :title="deletingId === item.id ? 'Deleting scan' : 'Delete scan'"
          @click="confirmDelete(item)"
        >
          <Trash2 :size="14" :class="deletingId === item.id ? 'animate-pulse' : ''" />
        </button>
      </li>
    </ul>

    <p
      v-if="actionError"
      class="mx-3 mb-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"
      role="alert"
    >
      {{ actionError.message }}
    </p>

    <!-- ═══════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════ -->
    <div class="flex items-center justify-between gap-2 border-t border-white/[0.06] bg-white/[0.01] px-4 py-2.5 text-[10px] text-slate-600">
      <span class="flex items-center gap-1.5">
        <Lock :size="10" class="text-slate-600" />
        Your browser history
      </span>
      <span class="tabular text-right">12 saved · older auto-delete</span>
    </div>
  </section>
</template>

<style scoped>
/* Skeleton shimmer sweep */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.04) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: skeletonSweep 1.6s ease-in-out infinite;
}
@keyframes skeletonSweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>