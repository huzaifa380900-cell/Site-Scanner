<template>
  <footer class="premium-footer bg-gradient-to-b from-gray-900 to-gray-950 border-t border-white/10 pt-12 pb-8">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Main Footer Content -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        <!-- Brand Column -->
        <div class="lg:col-span-4">
          <div class="space-y-4">
            <!-- Logo and Brand -->
            <div class="flex items-center space-x-3">
              <div class="relative">
                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-20 blur-md" />
                <div class="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 shadow-lg">
  <img src="/favicon.svg" alt="Site Scanner" class="w-6 h-6  brightness-400" />
                </div>
              </div>
              <div class="flex flex-col">
                <span class="text-white font-bold text-xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Site Scanner
                </span>
                <span class="text-sm text-gray-400 font-medium tracking-wide">
                  Premium Website Analysis
                </span>
              </div>
            </div>

            <p class="text-gray-400 text-sm leading-relaxed max-w-md">
              Advanced website analysis platform providing comprehensive insights into technologies, security, performance, and metadata. Professional-grade scanning for developers and security teams.
            </p>

            <!-- Social Links -->
            <div class="flex items-center space-x-3 pt-2">
              <a
                v-for="social in socialLinks"
                :key="social.name"
                :href="social.url"
                target="_blank"
                rel="noopener noreferrer"
                class="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                :aria-label="social.name"
                v-html="social.svg"
              ></a>
            </div>
          </div>
        </div>

        <!-- Quick Links Column -->
        <div class="lg:col-span-2">
          <h3 class="text-white font-semibold text-sm uppercase tracking-wider mb-4">
            Quick Links
          </h3>
          <ul class="space-y-3">
            <li v-for="link in quickLinks" :key="link.name">
              <router-link
                :to="link.path"
                class="text-gray-400 hover:text-white text-sm transition-colors duration-300 flex items-center group"
              >
                <span class="group-hover:translate-x-1 transition-transform duration-300">{{ link.name }}</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Platform Column -->
        <div class="lg:col-span-3">
          <h3 class="text-white font-semibold text-sm uppercase tracking-wider mb-4">
            Platform
          </h3>
          <ul class="space-y-3">
            <li v-for="feature in platformFeatures" :key="feature">
              <span class="text-gray-400 text-sm flex items-center">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2"></span>
                {{ feature }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Tools Column -->
        <div class="lg:col-span-3">
          <h3 class="text-white font-semibold text-sm uppercase tracking-wider mb-4">
            Tools
          </h3>
          <ul class="space-y-3">
            <li v-for="tool in tools" :key="tool">
              <span class="text-gray-400 text-sm flex items-center">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
                {{ tool }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Divider -->
      <div class="my-8 lg:my-12 border-t border-white/10"></div>

      <!-- Bottom Footer -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <!-- Copyright -->
        <div class="text-gray-500 text-sm">
          &copy; {{ currentYear }} Site Scanner. All rights reserved.
        </div>

        <!-- Legal Links -->
        <div class="flex flex-wrap items-center gap-4 lg:gap-6">
          <router-link
            v-for="legal in legalLinks"
            :key="legal.name"
            :to="legal.path"
            class="text-gray-500 hover:text-gray-300 text-sm transition-colors duration-300"
          >
            {{ legal.name }}
          </router-link>
        </div>

        <!-- Back to Top -->
        <button
          @click="scrollToTop"
          class="lg:hidden w-full lg:w-auto px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 flex items-center justify-center lg:justify-start space-x-2"
          aria-label="Back to top"
        >
          <span>Back to Top</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>

      <!-- Desktop Back to Top -->
      <button
        @click="scrollToTop"
        class="hidden lg:fixed lg:bottom-8 lg:right-8 lg:flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 z-40"
        aria-label="Back to top"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())

const socialLinks = [
  { 
    name: 'GitHub', 
    icon: 'github', 
    url: 'https://github.com',
    svg: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
    </svg>`
  },
  { 
    name: 'Twitter', 
    icon: 'twitter', 
    url: 'https://twitter.com',
    svg: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
    </svg>`
  },
  { 
    name: 'LinkedIn', 
    icon: 'linkedin', 
    url: 'https://linkedin.com',
    svg: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fill-rule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clip-rule="evenodd" />
    </svg>`
  },
  { 
    name: 'Website', 
    icon: 'globe', 
    url: 'https://sitescanner.com',
    svg: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>`
  }
]

const quickLinks = [
  { name: 'Home', path: '/' },
  { name: 'Features', path: '/#features' },
  { name: 'Tools', path: '/#features' },
  { name: 'How It Works', path: '/#how-it-works' },
  { name: 'Dashboard', path: '/app' },
  { name: 'Contact', path: '/#contact' }
]

const platformFeatures = [
  'Real-time Scanning',
  'Technology Detection',
  'Security Analysis',
  'Performance Metrics',
  'Metadata Extraction',
  'Browser Simulation'
]

const tools = [
  'HTTP Scanner',
  'Security Analyzer',
  'Tech Detector',
  'Browser Inspector',
  'Metadata Extractor',
  'Report Generator'
]

const legalLinks = [
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
  { name: 'Cookie Policy', path: '/cookies' },
  { name: 'Security', path: '/security' }
]

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
</script>

<style scoped>
.premium-footer {
  position: relative;
  overflow: hidden;
}

.premium-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), transparent);
}

.premium-footer::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent);
}

/* Hover effects for links */
.premium-footer a:hover {
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}

/* Social icon hover effects */
.premium-footer a[aria-label^="Git"]:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}

.premium-footer a[aria-label^="Twit"]:hover {
  color: #1da1f2;
  background: rgba(29, 161, 242, 0.1);
  box-shadow: 0 0 15px rgba(29, 161, 242, 0.2);
}

.premium-footer a[aria-label^="Link"]:hover {
  color: #0077b5;
  background: rgba(0, 119, 181, 0.1);
  box-shadow: 0 0 15px rgba(0, 119, 181, 0.2);
}

.premium-footer a[aria-label^="Web"]:hover {
  color: #06b6d4;
  background: rgba(6, 182, 212, 0.1);
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
}
</style>