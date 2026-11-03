<script setup>
import { ref } from 'vue'
import { Link2, Loader2, Search, ShieldCheck } from 'lucide-vue-next'
import { hostnameOf, validateUrlInput } from '../utils/formatters.js'

const props = defineProps({
  scanning: { type: Boolean, default: false },
})
const emit = defineEmits(['scan'])

const input = ref('')
const localError = ref('')

const examples = ['https://example.com', 'https://www.wikipedia.org']

function onInput() {
  if (localError.value) localError.value = ''
}

function submit() {
  if (props.scanning) return
  const result = validateUrlInput(input.value)
  if (!result.valid) {
    localError.value = result.message
    return
  }
  localError.value = ''
  emit('scan', result.value)
}

function useExample(url) {
  if (props.scanning) return
  input.value = url
  localError.value = ''
}
</script>

<template>
  <section class="panel relative overflow-hidden">
    <!-- Ambient background layer -->
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="shimmer-line absolute inset-x-0 top-0 h-px" />
      <div class="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div class="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
    </div>

    <div class="panel-body relative">
      <!-- ─── Header ────────────────────────────────── -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="eyebrow">New analysis</p>
          <h2 class="mt-1 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl">
            Scan a public website
          </h2>
          <p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
            Collect HTTP response, page metadata, technology fingerprints, browser errors and security-header observations
            in one report.
          </p>
        </div>
        <span class="chip border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200 transition-colors duration-300 hover:bg-cyan-400/[0.1]">
          <ShieldCheck :size="13" />
          SSRF-protected
        </span>
      </div>

      <!-- ─── Form ──────────────────────────────────── -->
      <form class="mt-5 flex flex-col gap-3 sm:flex-row" @submit.prevent="submit">
        <label class="group relative flex-1">
          <span class="sr-only">Website URL</span>
          <Link2
            :size="18"
            class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-300 group-focus-within:text-cyan-300"
            :class="localError ? 'text-rose-400' : ''"
            aria-hidden="true"
          />
          <input
            v-model="input"
            type="text"
            inputmode="url"
            autocomplete="url"
            spellcheck="false"
            placeholder="https://example.com"
            class="input input-bordered h-12 w-full border-white/10 bg-[#070d19] pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-300 focus:border-cyan-400/50 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.1)] focus:outline-none"
            :class="localError ? 'border-rose-400/50 focus:border-rose-400/60 focus:shadow-[0_0_0_3px_rgba(251,113,133,0.1)]' : ''"
            :disabled="scanning"
            :aria-invalid="Boolean(localError)"
            aria-describedby="scan-url-help"
            @input="onInput"
          />
        </label>
        <button
          type="submit"
          class="group/btn relative h-12 min-h-0 shrink-0 overflow-hidden rounded-lg px-6 text-sm font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
          :class="
            scanning || !input.trim()
              ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 opacity-60'
              : 'bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/40'
          "
          :disabled="scanning || !input.trim()"
        >
          <!-- Shimmer sweep on hover -->
          <span class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" aria-hidden="true" />
          <span class="relative flex items-center justify-center gap-2">
            <Loader2 v-if="scanning" :size="18" class="animate-spin" />
            <Search v-else :size="18" class="transition-transform duration-300 group-hover/btn:scale-110" />
            <span>{{ scanning ? 'Scanning…' : 'Scan Website' }}</span>
          </span>
        </button>
      </form>

      <!-- ─── Error ─────────────────────────────────── -->
      <p
        v-if="localError"
        class="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-300"
        role="alert"
      >
        <AlertCircle :size="13" class="shrink-0" />
        {{ localError }}
      </p>

      <!-- ─── Helper row ────────────────────────────── -->
      <div id="scan-url-help" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-500">
        <span>Only public, accessible website resources are analysed.</span>
        <span class="hidden text-slate-700 sm:inline">•</span>
        <span>No forms are submitted, no logins are attempted, no exploits are run.</span>
        <span class="ml-auto flex items-center gap-1">
          <button
            v-for="url in examples"
            :key="url"
            type="button"
            class="group/ex inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-[11px] font-normal text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-cyan-400/[0.06] hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="scanning"
            @click="useExample(url)"
          >
            <Globe :size="10" class="text-slate-600 transition-colors duration-200 group-hover/ex:text-cyan-300" />
            {{ hostnameOf(url) }}
          </button>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.shimmer-line {
  background-image: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.5), transparent);
  background-size: 200% 100%;
  animation: shimmerBorder 5s ease-in-out infinite;
}
@keyframes shimmerBorder {
  0%, 100% { background-position: 200% 0; }
  50% { background-position: -200% 0; }
}
</style>
