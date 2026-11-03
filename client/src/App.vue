<template>
  <div id="app">
    <!-- Premium Navigation Bar -->
    <PremiumNavbar v-if="route.name !== 'ScannerApp'" />

    <!-- Main Content with Router View -->
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Premium Footer (only on landing page) -->
    <PremiumFooter v-if="$route.name === 'LandingPage'" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PremiumNavbar from './components/premium/PremiumNavbar.vue'
import PremiumFooter from './components/premium/PremiumFooter.vue'
import { initAnimations } from './utils/premiumAnimations.js'

const route = useRoute()

onMounted(() => {
  // Initialize premium animations
  initAnimations()
})
</script>

<style>
/* Page transition animations */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Selection styling */
::selection {
  background: rgba(14, 165, 233, 0.3);
  color: #f8fafc;
}

/* Focus styling */
:focus-visible {
  outline: 2px solid rgba(14, 165, 233, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>