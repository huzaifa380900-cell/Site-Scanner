<template>
  <nav
    ref="navbarRef"
    :class="[
      'premium-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled || isMobileMenuOpen
        ? 'bg-white/10 backdrop-blur-xl border-b border-white/10 shadow-xl'
        : 'bg-transparent'
    ]"
    aria-label="Main navigation"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 lg:h-20">
        <!-- Logo and Brand -->
        <div class="flex items-center space-x-3">
          <router-link to="/" class="flex items-center space-x-3 group" aria-label="Site Scanner Home">
            <!-- Animated Logo Container -->
            <div class="relative">
              <!-- Glow Effect -->
              <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-20 blur-md group-hover:opacity-30 transition-opacity duration-500" />
              
              <!-- Logo Icon -->
              <div class="relative flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 shadow-lg group-hover:shadow-cyan-500/20 transition-all duration-500">
        
  <img src="/favicon.svg" alt="Site Scanner" class="w-6 h-6  brightness-400" />
                <!-- Pulsing Dot -->
                <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
              </div>
            </div>
            
            <!-- Brand Text -->
            <div class="flex flex-col">
              <span class="text-white font-bold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Site Scanner
              </span>
              <span class="text-xs text-gray-400 font-medium tracking-wide">
                Premium Analysis
              </span>
            </div>
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
                ? 'text-white bg-white/5'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            ]"
          >
            <span>{{ item.name }}</span>
            <!-- Active Indicator -->
            <span
              v-if="$route.path === item.path"
              class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            />
          </router-link>
        </div>

        <!-- CTA Button and Mobile Menu Toggle -->
        <div class="flex items-center space-x-3">
          <!-- Get Started Button -->
          <router-link
            to="/app"
            class="premium-cta-btn hidden lg:flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
            aria-label="Get Started with Site Scanner"
          >
            <span class="relative z-10">Get Started</span>
            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-100 transition-opacity duration-300" />
            <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </router-link>

          <!-- Mobile Menu Toggle -->
          <button
            @click="toggleMobileMenu"
            class="lg:hidden relative w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
            :aria-expanded="isMobileMenuOpen"
            aria-label="Toggle mobile menu"
          >
            <span class="sr-only">Open main menu</span>
            <div class="relative w-5 h-5">
              <span
                :class="[
                  'absolute left-0 w-5 h-0.5 bg-gray-300 transition-all duration-300',
                  isMobileMenuOpen ? 'top-2 rotate-45' : 'top-1'
                ]"
              />
              <span
                :class="[
                  'absolute left-0 w-5 h-0.5 bg-gray-300 transition-all duration-300',
                  isMobileMenuOpen ? 'top-2 -rotate-45' : 'top-3'
                ]"
              />
              <span
                :class="[
                  'absolute left-0 w-5 h-0.5 bg-gray-300 transition-all duration-300',
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
          class="lg:hidden pt-4 pb-6 border-t border-white/10 mt-2"
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
                  ? 'text-white bg-white/5'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              ]"
              :aria-label="item.name"
            >
              {{ item.name }}
            </router-link>
            
            <!-- Mobile CTA Button -->
            <router-link
              to="/app"
              @click="closeMobileMenu"
              class="block mt-4 px-4 py-3 rounded-xl text-center text-base font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.premium-nav-item:hover::before {
  left: 100%;
}

.premium-cta-btn {
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.3);
}

.premium-cta-btn:hover {
  box-shadow: 0 6px 25px rgba(6, 182, 212, 0.4);
}

.premium-cta-btn::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #06b6d4, #3b82f6, #06b6d4);
  border-radius: 14px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.premium-cta-btn:hover::after {
  opacity: 1;
}
</style>