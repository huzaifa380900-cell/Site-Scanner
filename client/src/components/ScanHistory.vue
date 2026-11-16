<script setup>
import { ref } from 'vue'
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
const deleteDialog = ref(null)
const deleteCandidate = ref(null)

function statusClass(status) {
  return status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
}

function promptDelete(item) {
  deleteCandidate.value = item
  deleteDialog.value?.showModal()
}

function closeDeleteDialog() {
  if (deleteDialog.value?.open) deleteDialog.value.close()
  deleteCandidate.value = null
}

function deleteSelectedScan() {
  if (!deleteCandidate.value) return
  emit('delete', deleteCandidate.value.id)
  closeDeleteDialog()
}

function closeOnBackdrop(event) {
  if (event.target === deleteDialog.value) closeDeleteDialog()
}
</script>
<template>
  <section class="panel overflow-hidden relative">
    <!-- Ambient accent -->
    <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/40 to-transparent" aria-hidden="true" />

    <!-- ═══════════════════════════════════════════════
         HEADER
         ═══════════════════════════════════════════════ -->
    <div class="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
      <div class="flex items-center gap-2.5">
        <div class="grid h-7 w-7 place-items-center rounded-md border border-lime-300 bg-lime-100">
          <History :size="14" class="text-lime-600" />
        </div>
        <h2 class="text-sm font-semibold text-gray-900">Recent scans</h2>
        <span
          v-if="items.length"
          class="badge badge-sm border-0 bg-slate-100 text-[10px] font-semibold text-slate-600 transition-colors duration-300"
        >{{ items.length }}</span>
      </div>
      <button
        type="button"
        class="group/refresh grid h-7 w-7 place-items-center rounded-md border border-transparent text-slate-400 transition-all duration-300 hover:border-lime-300 hover:bg-lime-50 hover:text-lime-600 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div class="relative overflow-hidden rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
        <div class="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-amber-400/30 blur-2xl" />
        <div class="relative flex items-start gap-2">
          <div class="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-amber-400 bg-amber-100">
            <AlertTriangle :size="12" class="text-amber-600" />
          </div>
          <div>
            <p class="font-semibold">History unavailable</p>
            <p class="mt-1 text-amber-700/80">{{ error.message }}</p>
            <p v-if="error.code === 'DATABASE_UNAVAILABLE'" class="mt-1 text-amber-700/70">
              Connect MongoDB Atlas and confirm via
              <span class="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px]">/api/health</span>.
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
        class="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3"
      >
        <div class="skeleton-shimmer absolute inset-0" />
        <div class="relative h-3 w-1/2 rounded bg-slate-200"></div>
        <div class="relative mt-2 h-2.5 w-3/4 rounded bg-slate-100"></div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════
         EMPTY STATE
         ═══════════════════════════════════════════════ -->
    <div v-else-if="!items.length" class="px-4 py-10 text-center">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-slate-50">
        <Database :size="20" class="text-slate-400" />
      </div>
      <p class="mt-3 text-xs font-semibold text-gray-900">No scans saved in this browser yet</p>
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
              ? 'border-lime-400 bg-lime-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-lime-300 hover:bg-lime-50/50'
          "
          :disabled="disabled"
          :aria-current="item.id === selectedId ? 'true' : undefined"
          @click="$emit('select', item.id)"
        >
          <!-- Left accent stripe on active -->
          <span
            v-if="item.id === selectedId"
            class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-lime-500"
            aria-hidden="true"
          />

          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <span
                class="truncate text-xs font-medium transition-colors duration-300"
                :class="item.id === selectedId ? 'text-gray-900' : 'text-slate-700 group-hover:text-gray-900'"
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
                <span class="font-semibold text-slate-700">{{ item.observationScore }}</span>
              </span>
            </div>
          </div>
          <ChevronRight
            :size="14"
            class="shrink-0 transition-all duration-300"
            :class="item.id === selectedId ? 'translate-x-0.5 text-lime-600' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:text-lime-600'"
          />
        </button>
        <button
          type="button"
          class="grid w-9 shrink-0 place-items-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="disabled || Boolean(deletingId)"
          :aria-label="`Delete scan for ${item.hostname}`"
          :title="deletingId === item.id ? 'Deleting scan' : 'Delete scan'"
          @click="promptDelete(item)"
        >
          <Trash2 :size="14" :class="deletingId === item.id ? 'animate-pulse' : ''" />
        </button>
      </li>
    </ul>

    <p
      v-if="actionError"
      class="mx-3 mb-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] text-rose-700"
      role="alert"
    >
      {{ actionError.message }}
    </p>

    <!-- ═══════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════ -->
    <div class="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[10px] text-slate-500">
      <span class="flex items-center gap-1.5">
        <Lock :size="10" class="text-slate-400" />
        Your browser history
      </span>
      <span class="tabular text-right">12 saved · older auto-delete</span>
    </div>
  </section>

  <Teleport to="body">
    <dialog
      ref="deleteDialog"
      class="delete-dialog m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-700 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      @cancel.prevent="closeDeleteDialog"
      @click="closeOnBackdrop"
    >
      <div class="relative overflow-hidden p-5 sm:p-6">
        <div class="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-rose-400/10 blur-3xl" />
        <div class="relative">
          <div class="flex items-start gap-4">
            <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rose-300 bg-rose-100 text-rose-600">
              <AlertTriangle :size="21" />
            </div>
            <div class="min-w-0 pt-0.5">
              <h2 id="delete-dialog-title" class="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                Delete this scan?
              </h2>
              <p class="mt-1 break-all text-sm font-medium text-lime-700">
                {{ deleteCandidate?.hostname }}
              </p>
            </div>
          </div>

          <p id="delete-dialog-description" class="mt-4 text-sm leading-relaxed text-slate-600">
            This report will be permanently removed from your saved history. This action cannot be undone.
          </p>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              autofocus
              class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-400"
              @click="closeDeleteDialog"
            >
              Keep scan
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition-colors hover:border-rose-400 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
              @click="deleteSelectedScan"
            >
              <Trash2 :size="15" />
              Delete scan
            </button>
          </div>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.delete-dialog[open] {
  animation: dialogEnter 160ms ease-out;
}

.delete-dialog::backdrop {
  background: rgb(15 23 42 / 60%);
  backdrop-filter: blur(5px);
}

@keyframes dialogEnter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Skeleton shimmer sweep */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(132, 204, 22, 0.06) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: skeletonSweep 1.6s ease-in-out infinite;
}
@keyframes skeletonSweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .delete-dialog[open] {
    animation: none;
  }
}
</style>
