<template>
  <nav
    ref="navbarRef"
    :class="[
      'premium-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled || isMobileMenuOpen
        ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm'
        : 'bg-white/80 backdrop-blur-sm border-b border-slate-100'
    ]"
    aria-label="Main navigation"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 lg:h-20">
        <!-- Logo and Brand -->
        <div class="flex items-center">
          <router-link to="/" class="flex items-center group" aria-label="Site Scanner Home">
            <img src="/logo.png" alt="Site Scanner" class="h-8 sm:h-9 md:h-10 w-auto object-contain" />
          </router-link>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden lg:flex items-center space-x-1">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            :aria-label="item.name"
            class="premium-nav-item relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300"
            :class="[
              $route.path === item.path
                ? 'text-lime-700 bg-lime-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            ]"
          >
            <span>{{ item.name }}</span>
            <!-- Active Indicator -->
            <span
              v-if="$route.path === item.path"
              class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-lime-500 to-green-500 rounded-full"
            />
          </router-link>
        </div>

        <!-- CTA Button and Mobile Menu Toggle -->
        <div class="flex items-center space-x-3">
          <!-- Get Started Button -->
          <router-link
            to="/app"
            class="premium-cta-btn hidden lg:flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-400 hover:to-green-400 shadow-brand-sm hover:shadow-brand-md"
            aria-label="Get Started with Site Scanner"
          >
            <span class="relative z-10">Get Started</span>
          </router-link>

          <!-- Mobile Menu Toggle -->
          <button
            @click="toggleMobileMenu"
            class="lg:hidden relative w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all duration-300"
            :aria-expanded="isMobileMenuOpen"
            aria-label="Toggle mobile menu"
          >
            <span class="sr-only">Open main menu</span>
            <div class="relative w-5 h-5">
              <span
                :class="[
                  'absolute left-0 w-5 h-0.5 bg-slate-600 transition-all duration-300',
                  isMobileMenuOpen ? 'top-2 rotate-45' : 'top-1'
                ]"
              />
              <span
                :class="[
                  'absolute left-0 w-5 h-0.5 bg-slate-600 transition-all duration-300',
                  isMobileMenuOpen ? 'top-2 -rotate-45' : 'top-3'
                ]"
              />
              <span
                :class="[
                  'absolute left-0 w-5 h-0.5 bg-slate-600 transition-all duration-300',
                  isMobileMenuOpen ? 'top-2 opacity-0' : 'top-5'
                ]"
              />
            </div>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <div
          v-if="isMobileMenuOpen"
          class="lg:hidden pt-4 pb-6 border-t border-slate-100 mt-2"
        >
          <div class="space-y-2">
            <router-link
              v-for="item in navItems"
              :key="item.name"
              :to="item.path"
              @click="closeMobileMenu"
              class="block px-4 py-3 rounded-xl text-base font-medium transition-all duration-300"
              :class="[
                $route.path === item.path
                  ? 'text-lime-700 bg-lime-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              ]"
              :aria-label="item.name"
            >
              {{ item.name }}
            </router-link>
            
            <!-- Mobile CTA Button -->
            <router-link
              to="/app"
              @click="closeMobileMenu"
              class="block mt-4 px-4 py-3 rounded-xl text-center text-base font-semibold text-white bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-400 hover:to-green-400 transition-all duration-300 shadow-brand-sm"
              aria-label="Get Started with Site Scanner"
            >
              Get Started
            </router-link>
          </div>
        </div>
      </transition>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const navbarRef = ref(null)
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Features', path: '/#features' },
  { name: 'Tools', path: '/#features' },
  { name: 'How It Works', path: '/#how-it-works' },
  { name: 'Dashboard', path: '/app' }
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Close mobile menu when clicking outside
const handleClickOutside = (event) => {
  if (navbarRef.value && !navbarRef.value.contains(event.target)) {
    closeMobileMenu()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleClickOutside)
  
  // Initialize scroll position
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.premium-navbar {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.premium-nav-item {
  position: relative;
  overflow: hidden;
}

.premium-nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(132, 204, 22, 0.08), transparent);
  transition: left 0.5s ease;
}

.premium-nav-item:hover::before {
  left: 100%;
}

.premium-cta-btn {
  position: relative;
  overflow: hidden;
}

.premium-cta-btn::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #84cc16, #22c55e, #84cc16);
  border-radius: 14px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.premium-cta-btn:hover::after {
  opacity: 1;
}
</style>
