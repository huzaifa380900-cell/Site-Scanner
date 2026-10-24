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
    <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
    <div class="panel-body">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="eyebrow">New analysis</p>
          <h2 class="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Scan a public website</h2>
          <p class="mt-1.5 max-w-2xl text-sm text-slate-400">
            Collect HTTP response, page metadata, technology fingerprints, browser errors and security-header observations
            in one report.
          </p>
        </div>
        <span class="chip border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200">
          <ShieldCheck :size="13" />
          SSRF-protected
        </span>
      </div>

      <form class="mt-5 flex flex-col gap-3 sm:flex-row" @submit.prevent="submit">
        <label class="relative flex-1">
          <span class="sr-only">Website URL</span>
          <Link2
            :size="18"
            class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            v-model="input"
            type="text"
            inputmode="url"
            autocomplete="url"
            spellcheck="false"
            placeholder="https://example.com"
            class="input input-bordered h-12 w-full border-white/10 bg-[#070d19] pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
            :class="localError ? 'border-rose-400/50' : ''"
            :disabled="scanning"
            :aria-invalid="Boolean(localError)"
            aria-describedby="scan-url-help"
            @input="onInput"
          />
        </label>
        <button
          type="submit"
          class="btn btn-primary h-12 min-h-0 shrink-0 gap-2 px-6 text-sm font-semibold"
          :disabled="scanning || !input.trim()"
        >
          <Loader2 v-if="scanning" :size="18" class="animate-spin" />
          <Search v-else :size="18" />
          <span>{{ scanning ? 'Scanning…' : 'Scan Website' }}</span>
        </button>
      </form>

      <p v-if="localError" class="mt-2 text-xs font-medium text-rose-300" role="alert">{{ localError }}</p>

      <div id="scan-url-help" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-500">
        <span>Only public, accessible website resources are analysed.</span>
        <span class="hidden text-slate-700 sm:inline">•</span>
        <span>No forms are submitted, no logins are attempted, no exploits are run.</span>
        <span class="ml-auto flex items-center gap-1">
          <button
            v-for="url in examples"
            :key="url"
            type="button"
            class="btn btn-ghost btn-xs h-7 min-h-0 px-2 text-[11px] font-normal text-slate-400 hover:text-cyan-300"
            :disabled="scanning"
            @click="useExample(url)"
          >
            {{ hostnameOf(url) }}
          </button>
        </span>
      </div>
    </div>
  </section>
</template>
