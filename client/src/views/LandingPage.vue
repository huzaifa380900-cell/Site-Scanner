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
.landing-page{min-height:100vh;padding-top:5rem;color:#e8efec;background:#080b0d!important}
.hero-section{padding-top:clamp(4rem,9vw,7.5rem)!important;padding-bottom:clamp(3.5rem,7vw,6rem)!important;background:#080b0d!important}
.hero-section>.absolute{display:none!important}.hero-section .max-w-4xl{max-width:900px;text-align:left;margin-left:0}
.hero-section .inline-flex.items-center.gap-2{border:1px solid rgba(226,239,235,.12)!important;background:rgba(255,255,255,.025)!important;border-radius:6px!important;padding:7px 10px!important}
.hero-title{max-width:850px;margin-bottom:1.25rem!important;font-size:clamp(2.65rem,6vw,5.1rem)!important;line-height:1.04!important;letter-spacing:-.065em!important;font-weight:650!important}
.hero-title span{background:none!important;color:#edf4f0!important;-webkit-text-fill-color:currentColor!important}.hero-title span:last-child{color:#36d4a5!important}
.hero-subtitle{max-width:650px!important;margin-left:0!important;font-size:clamp(1rem,1.7vw,1.18rem)!important;line-height:1.75!important;color:#9ba9a4!important}
.hero-cta{justify-content:flex-start!important;margin-bottom:3.5rem!important}
.premium-button{min-height:48px;padding:0 21px!important;border-radius:8px!important;background:#27c99a!important;color:#06140f!important;box-shadow:none!important;transform:none!important}
.premium-button>div{display:none!important}.premium-button:hover{background:#45d9ad!important;box-shadow:0 5px 18px rgba(39,201,154,.14)!important}
.premium-button-outline{min-height:48px;padding:0 20px!important;border:1px solid rgba(226,239,235,.16)!important;border-radius:8px!important;color:#dce7e2!important;font-size:1rem!important}
.stat-card{padding:18px 12px!important;border:0!important;border-top:1px solid rgba(226,239,235,.12)!important;border-radius:0!important;background:transparent!important;text-align:left!important;backdrop-filter:none!important}
.stat-card .stat-number{color:#e8efec!important;font-size:1.65rem!important;letter-spacing:-.045em}
.features-section,.how-it-works-section,.cta-section{background:#080b0d!important}
.features-section,.how-it-works-section{border-top:1px solid rgba(226,239,235,.08)}
.features-section h2,.how-it-works-section h2,.cta-section h2{font-size:clamp(1.8rem,3.5vw,2.8rem)!important;letter-spacing:-.045em!important;color:#e8efec!important}
.features-section h2 span,.how-it-works-section h2 span,.cta-section h2 span{background:none!important;color:#36d4a5!important;-webkit-text-fill-color:currentColor!important}
.feature-card>div,.timeline-item .premium-card{border:1px solid rgba(226,239,235,.1)!important;border-radius:12px!important;background:#0e1315!important;box-shadow:none!important;backdrop-filter:none!important}
.feature-card:hover>div{transform:translateY(-2px);border-color:rgba(39,201,154,.28)!important}
.feature-card>div>div:first-child{width:42px!important;height:42px!important;border-radius:9px!important;background:rgba(39,201,154,.09)!important}
.feature-card>div>div:first-child>div{color:#50dcb3!important;font-size:1.2rem!important}
.feature-card h3,.timeline-item h3{color:#e8efec!important}.feature-card p,.timeline-item p{color:#9ba9a4!important}
.timeline-item>div>div:first-child{background:#27c99a!important;color:#06140f!important;width:44px!important;height:44px!important;font-size:1rem!important}
.timeline-item:before{display:none!important}.cta-section{border-top:1px solid rgba(226,239,235,.08)}
@media(max-width:640px){.hero-section{padding-top:3.5rem!important}.hero-title br{display:none}.hero-cta{align-items:stretch!important}.hero-cta>*{width:100%;justify-content:center}.stat-card{padding:14px 8px!important}}
</style>