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
    <div v-if="!technologies.length" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-6 py-12 text-center">
      <Cpu :size="28" class="text-slate-500" />
      <p class="mt-3 text-sm font-medium text-slate-200">No technologies were identified</p>
      <p class="mt-1 max-w-md text-xs text-slate-500">
        The page did not expose any of the public markers in the fingerprint registry. Absence of a detection does not mean
        the technology is absent.
      </p>
    </div>

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span class="chip">
          <Cpu :size="12" />
          {{ technologies.length }} detection{{ technologies.length === 1 ? '' : 's' }}
        </span>
        <span v-if="inferredServers" class="chip">Server software inferred only from response headers</span>
        <span class="ml-auto">Confidence reflects the strength of public evidence.</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <section v-for="group in groups" :key="group.category" class="rounded-xl border border-white/[0.06] bg-white/[0.015]">
          <header class="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
            <h3 class="text-sm font-medium text-slate-200">{{ group.label }}</h3>
            <span class="badge badge-sm border-0 bg-white/[0.04] text-[10px] text-slate-400">{{ group.items.length }}</span>
          </header>
          <div class="divide-y divide-white/[0.05]">
            <div v-for="tech in group.items" :key="`${group.category}-${tech.name}`" class="p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-semibold text-slate-100">{{ tech.name }}</p>
                <span
                  class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize"
                  :class="CONFIDENCE_CLASSES[tech.confidence] || CONFIDENCE_CLASSES.medium"
                >
                  {{ tech.confidence }} confidence
                </span>
              </div>
              <p v-if="tech.description" class="mt-1.5 text-xs leading-relaxed text-slate-400">{{ tech.description }}</p>
              <div class="mt-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evidence</p>
                <ul class="mt-1 space-y-1">
                  <li
                    v-for="(item, index) in tech.evidence"
                    :key="index"
                    class="break-words rounded border border-white/[0.05] bg-[#070d19]/70 px-2 py-1 font-mono text-[11px] text-slate-400"
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
