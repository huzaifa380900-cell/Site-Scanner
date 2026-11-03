<script setup>
import { computed } from 'vue'
import { Cpu } from 'lucide-vue-next'
import { CONFIDENCE_CLASSES, TECH_CATEGORY_LABELS, techCategoryLabel, truncate } from '../utils/formatters.js'

const props = defineProps({
  technologies: { type: Array, default: () => [] },
})

const ORDER = ['frontend', 'cms', 'analytics', 'ui', 'cdn', 'server']

const groups = computed(() => {
  const map = new Map()
  for (const tech of props.technologies) {
    if (!map.has(tech.category)) map.set(tech.category, [])
    map.get(tech.category).push(tech)
  }
  return [...map.entries()]
    .sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map(([category, items]) => ({
      category,
      label: TECH_CATEGORY_LABELS[category] || techCategoryLabel(category),
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
})

const inferredServers = computed(() => props.technologies.filter((tech) => tech.category === 'server').length)
</script>
<template>
  <div>
    <!-- ═══════════════════════════════════════════════════
         EMPTY STATE
         ═══════════════════════════════════════════════════ -->
    <div
      v-if="!technologies.length"
      class="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-6 py-14 text-center"
    >
      <div class="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-slate-500/10 blur-3xl" />
      <div class="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-lg shadow-black/20">
        <Cpu :size="26" class="text-slate-500" />
      </div>
      <p class="relative mt-4 text-sm font-semibold text-slate-200">No technologies were identified</p>
      <p class="relative mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
        The page did not expose any of the public markers in the fingerprint registry. Absence of a detection does not mean
        the technology is absent.
      </p>
    </div>

    <template v-else>
      <!-- ═══════════════════════════════════════════════════
           SUMMARY BAR
           ═══════════════════════════════════════════════════ -->
      <div class="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span class="chip group inline-flex items-center gap-1.5 border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200 transition-colors duration-300 hover:bg-cyan-400/[0.1]">
          <Cpu :size="12" class="transition-transform duration-300 group-hover:rotate-12" />
          <span class="font-medium">{{ technologies.length }}</span>
          detection{{ technologies.length === 1 ? '' : 's' }}
        </span>
        <span
          v-if="inferredServers"
          class="chip border-amber-400/20 bg-amber-500/[0.06] text-amber-200 transition-colors duration-300 hover:bg-amber-500/[0.1]"
        >
          Server software inferred only from response headers
        </span>
        <span class="ml-auto italic">Confidence reflects the strength of public evidence.</span>
      </div>

      <!-- ═══════════════════════════════════════════════════
           GROUPS GRID
           ═══════════════════════════════════════════════════ -->
      <div class="grid gap-4 lg:grid-cols-2">
        <section
          v-for="group in groups"
          :key="group.category"
          class="group/section relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015] transition-colors duration-300 hover:border-white/[0.1]"
        >
          <!-- Top shimmer -->
          <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent opacity-0 transition-opacity duration-500 group-hover/section:opacity-100" />

          <!-- Category header -->
          <header class="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.01] px-4 py-3">
            <div class="flex items-center gap-2.5">
              <div class="grid h-7 w-7 place-items-center rounded-md border border-violet-400/20 bg-violet-500/10 transition-colors duration-300 group-hover/section:border-violet-400/30">
                <Layers :size="14" class="text-violet-300" />
              </div>
              <h3 class="text-sm font-semibold text-slate-200">{{ group.label }}</h3>
            </div>
            <span class="badge badge-sm border-0 bg-white/[0.05] text-[10px] font-semibold text-slate-400">
              {{ group.items.length }}
            </span>
          </header>

          <!-- Tech items -->
          <div class="divide-y divide-white/[0.05]">
            <div
              v-for="tech in group.items"
              :key="`${group.category}-${tech.name}`"
              class="group/item p-4 transition-colors duration-200 hover:bg-white/[0.02]"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-semibold text-slate-100 transition-colors duration-200 group-hover/item:text-white">
                  {{ tech.name }}
                </p>
                <span
                  class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize transition-transform duration-300 group-hover/item:scale-105"
                  :class="CONFIDENCE_CLASSES[tech.confidence] || CONFIDENCE_CLASSES.medium"
                >
                  {{ tech.confidence }} confidence
                </span>
              </div>

              <p v-if="tech.description" class="mt-1.5 text-xs leading-relaxed text-slate-400">
                {{ tech.description }}
              </p>

              <div class="mt-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Evidence
                </p>
                <ul class="mt-1 space-y-1">
                  <li
                    v-for="(item, index) in tech.evidence"
                    :key="index"
                    class="break-words rounded border border-white/[0.05] bg-[#070d19]/70 px-2 py-1.5 font-mono text-[11px] text-slate-400 transition-colors duration-200 hover:border-cyan-400/20 hover:bg-[#070d19] hover:text-slate-300"
                    :title="item"
                  >
                    {{ truncate(item, 140) }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
