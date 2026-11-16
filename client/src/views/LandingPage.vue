<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section relative overflow-hidden pt-24 lg:pt-32 pb-16 lg:pb-24">
      <!-- Animated Background -->
      <div class="absolute inset-0 z-0">
        <div class="floating-element absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div class="floating-element absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div class="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto text-center">
          <!-- Eyebrow -->
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 lg:mb-8">
            <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span class="text-sm font-medium text-gray-300">Free Website Analysis Platform</span>
          </div>

          <!-- Main Heading -->
          <h1 class="hero-title text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
            <span class="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Advanced Website
            </span>
            <br>
            <span class="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Analysis & Intelligence
            </span>
          </h1>

          <!-- Subtitle -->
          <p class="hero-subtitle text-lg sm:text-xl lg:text-2xl text-gray-400 max-w-2xl mx-auto mb-8 lg:mb-12 leading-relaxed">
            Professional-grade scanning platform that provides comprehensive insights into technologies, security, performance, and metadata of any public website.
          </p>

          <!-- CTA Buttons -->
          <div class="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 lg:mb-16">
            <router-link
              to="/app"
              class="premium-button group relative px-8 py-4 rounded-xl text-lg font-semibold text-white transition-all duration-300 transform hover:scale-105"
            >
              <span class="relative z-10 flex items-center justify-center gap-2">
                Start Scanning
                <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-100 transition-opacity duration-300" />
              <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </router-link>

            <button
              @click="scrollToFeatures"
              class="premium-button-outline px-8 py-4 rounded-xl text-lg font-semibold text-gray-300 border-2 border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-300"
            >
              Explore Features
            </button>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-3xl mx-auto">
            <div class="stat-card text-center">
              <div class="text-3xl lg:text-4xl font-bold text-white mb-2 stat-number">100%</div>
              <div class="text-sm text-gray-400">Real-time Analysis</div>
            </div>
            <div class="stat-card text-center">
              <div class="text-3xl lg:text-4xl font-bold text-white mb-2 stat-number">50+</div>
              <div class="text-sm text-gray-400">Technologies Detected</div>
            </div>
            <div class="stat-card text-center">
              <div class="text-3xl lg:text-4xl font-bold text-white mb-2 stat-number">∞</div>
              <div class="text-sm text-gray-400">Unlimited Scans</div>
            </div>
            <div class="stat-card text-center">
              <div class="text-3xl lg:text-4xl font-bold text-white mb-2 stat-number">24/7</div>
              <div class="text-sm text-gray-400">Platform Availability</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section py-16 lg:py-24 bg-gradient-to-b from-transparent to-gray-900/30">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Powerful Features for
            <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Professional Analysis
            </span>
          </h2>
          <p class="text-lg text-gray-400 max-w-3xl mx-auto">
            Comprehensive tools and features designed for developers, security teams, and digital agencies.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div v-for="feature in features" :key="feature.id" class="feature-card premium-card group">
            <div class="relative p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-white/10 backdrop-blur-sm transition-all duration-300">
              <!-- Icon -->
              <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <div class="text-2xl text-cyan-300">{{ feature.icon }}</div>
              </div>

              <!-- Title -->
              <h3 class="text-xl font-semibold text-white mb-3">{{ feature.title }}</h3>

              <!-- Description -->
              <p class="text-gray-400 mb-4">{{ feature.description }}</p>

              <!-- Features List -->
              <ul class="space-y-2">
                <li v-for="item in feature.items" :key="item" class="flex items-center text-sm text-gray-500">
                  <svg class="w-4 h-4 text-cyan-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="how-it-works-section py-16 lg:py-24">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 lg:mb-16">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Simple,
            <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Powerful Workflow
            </span>
          </h2>
          <p class="text-lg text-gray-400 max-w-3xl mx-auto">
            Three simple steps to get comprehensive website analysis and intelligence.
          </p>
        </div>

        <div class="relative">
          <!-- Timeline Line -->
          <div class="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/20 via-blue-500/20 to-transparent transform -translate-x-1/2"></div>

          <div class="space-y-12 lg:space-y-0">
            <div v-for="(step, index) in steps" :key="step.id" class="timeline-item relative min-w-0">
              <div class="lg:flex lg:items-center lg:gap-12" :class="index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'">
                <!-- Step Number -->
                <div class="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white font-bold text-2xl mb-4 lg:mb-0 lg:flex-shrink-0">
                  {{ step.number }}
                </div>

                <!-- Content -->
                <div class="flex-1 premium-card p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-white/10 backdrop-blur-sm">
                  <h3 class="text-xl font-semibold text-white mb-3">{{ step.title }}</h3>
                  <p class="text-gray-400 mb-4">{{ step.description }}</p>
                  
                  <!-- Step Details -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div v-for="detail in step.details" :key="detail" class="flex items-center text-sm text-gray-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2"></span>
                      {{ detail }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section py-16 lg:py-24 bg-gradient-to-r from-cyan-900/20 via-blue-900/20 to-purple-900/20">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Start
            <span class="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Analyzing Websites?
            </span>
          </h2>
          
          <p class="text-lg text-gray-300 mb-8 lg:mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of developers, security professionals, and digital agencies who trust Site Scanner for comprehensive website analysis.
          </p>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <router-link
              to="/app"
              class="premium-button group relative px-8 py-4 rounded-xl text-lg font-semibold text-white transition-all duration-300 transform hover:scale-105"
            >
              <span class="relative z-10 flex items-center justify-center gap-2">
                Start Scanning Free
                <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 opacity-100 transition-opacity duration-300" />
              <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </router-link>

            <button
              @click="scrollToTop"
              class="premium-button-outline px-8 py-4 rounded-xl text-lg font-semibold text-gray-300 border-2 border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-300"
            >
              Explore More Features
            </button>
          </div>

          <p class="text-sm text-gray-500 mt-6">
            No credit card required. Start analyzing websites instantly.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
// Icons will be handled with simple SVG or emoji for now
import { initAnimations } from '../utils/premiumAnimations.js'

const features = [
  {
    id: 1,
    icon: '🔍',
    title: 'Comprehensive Scanning',
    description: 'Deep analysis of websites including technologies, security headers, performance metrics, and metadata.',
    items: [
      'Real-time scanning',
      'Technology detection',
      'Security analysis',
      'Performance metrics'
    ]
  },
  {
    id: 2,
    icon: '🛡️',
    title: 'Security Analysis',
    description: 'Identify security vulnerabilities, misconfigurations, and best practice violations.',
    items: [
      'HTTPS configuration',
      'Security headers',
      'CSP analysis',
      'Vulnerability detection'
    ]
  },
  {
    id: 3,
    icon: '💻',
    title: 'Technology Detection',
    description: 'Identify frameworks, CMS, analytics tools, libraries, and infrastructure technologies.',
    items: [
      '50+ technologies',
      'Version detection',
      'Library identification',
      'Infrastructure insight'
    ]
  },
  {
    id: 4,
    icon: '🌐',
    title: 'Browser Simulation',
    description: 'Simulate real browser behavior to detect console errors, failed resources, and JavaScript issues.',
    items: [
      'Headless Chromium',
      'Console error detection',
      'Resource loading',
      'JavaScript execution'
    ]
  },
  {
    id: 5,
    icon: '⚡',
    title: 'Performance Insights',
    description: 'Analyze website performance metrics, load times, and optimization opportunities.',
    items: [
      'Load time analysis',
      'Resource optimization',
      'Performance scoring',
      'Best practices'
    ]
  },
  {
    id: 6,
    icon: '📊',
    title: 'Detailed Reporting',
    description: 'Comprehensive reports with actionable insights, recommendations, and export options.',
    items: [
      'PDF export',
      'JSON data',
      'Actionable insights',
      'Historical tracking'
    ]
  }
]

const steps = [
  {
    id: 1,
    number: '01',
    title: 'Enter Website URL',
    description: 'Simply enter any public website URL to start the scanning process.',
    details: [
      'Supports HTTP/HTTPS',
      'Public websites only',
      'Automatic validation',
      'Instant processing'
    ]
  },
  {
    id: 2,
    number: '02',
    title: 'Real-time Analysis',
    description: 'Our platform performs comprehensive scanning across multiple dimensions.',
    details: [
      'Technology detection',
      'Security analysis',
      'Performance metrics',
      'Metadata extraction'
    ]
  },
  {
    id: 3,
    number: '03',
    title: 'Get Detailed Insights',
    description: 'Receive comprehensive reports with actionable insights and recommendations.',
    details: [
      'Interactive dashboard',
      'Exportable reports',
      'Actionable recommendations',
      'Historical tracking'
    ]
  }
]

const scrollToFeatures = () => {
  const featuresSection = document.getElementById('features')
  if (featuresSection) {
    featuresSection.scrollIntoView({ behavior: 'smooth' })
  }
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  // Initialize animations
  initAnimations()
})
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
}

.hero-section {
  background: radial-gradient(ellipse at 50% 0%, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
}

.premium-card {
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.premium-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border-color: rgba(6, 182, 212, 0.3);
}

.premium-button {
  box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
}

.premium-button:hover {
  box-shadow: 0 8px 25px rgba(6, 182, 212, 0.6);
}

.premium-button-outline:hover {
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

.feature-card:hover .feature-icon {
  transform: rotateY(180deg);
}

.stat-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
  border-radius: 50%;
  z-index: 1;
}

@media (max-width: 1024px) {
  .timeline-item::before {
    display: none;
  }
}

/* Animation classes */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
}

.animate-card {
  opacity: 0;
  transform: translateY(20px);
}

.stagger-text {
  overflow: hidden;
}

.stagger-char {
  display: inline-block;
}
</style>