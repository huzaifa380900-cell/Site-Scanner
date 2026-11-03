import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * Initialize all premium animations for the application
 */
export function initAnimations() {
  if (typeof window === 'undefined') return

  // Initialize scroll animations
  initScrollAnimations()
  
  // Initialize hero animations
  initHeroAnimations()
  
  // Initialize hover effects
  initHoverEffects()
  
  // Initialize component animations
  initComponentAnimations()
}

/**
 * Initialize scroll-triggered animations
 */
function initScrollAnimations() {
  // Animate sections on scroll
  gsap.utils.toArray('.animate-on-scroll').forEach((section) => {
    gsap.from(section, {
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse'
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    })
  })

  // Animate cards on scroll
  gsap.utils.toArray('.animate-card').forEach((card, index) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        end: 'bottom 15%',
        toggleActions: 'play none none reverse'
      },
      y: 30,
      opacity: 0,
      duration: 0.8,
      delay: index * 0.1,
      ease: 'power3.out'
    })
  })

  // Stagger text animations
  gsap.utils.toArray('.stagger-text').forEach((element) => {
    const text = element.textContent
    element.innerHTML = text.split('').map(char => 
      `<span class="stagger-char">${char}</span>`
    ).join('')

    gsap.from(element.querySelectorAll('.stagger-char'), {
      scrollTrigger: {
        trigger: element,
        start: 'top 90%',
        end: 'bottom 10%',
        toggleActions: 'play none none reverse'
      },
      y: 20,
      opacity: 0,
      stagger: 0.03,
      duration: 0.5,
      ease: 'power3.out'
    })
  })
}

/**
 * Initialize hero section animations
 */
function initHeroAnimations() {
  const heroSection = document.querySelector('.hero-section')
  if (!heroSection) return

  // Animate hero elements
  gsap.from('.hero-title', {
    duration: 1.2,
    y: 50,
    opacity: 0,
    ease: 'power3.out',
    delay: 0.2
  })

  gsap.from('.hero-subtitle', {
    duration: 1,
    y: 30,
    opacity: 0,
    ease: 'power3.out',
    delay: 0.4
  })

  gsap.from('.hero-cta', {
    duration: 0.8,
    scale: 0.8,
    opacity: 0,
    ease: 'back.out(1.7)',
    delay: 0.6
  })

  // Floating animation for hero elements
  gsap.to('.floating-element', {
    y: -10,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut'
  })
}

/**
 * Initialize hover effects
 */
function initHoverEffects() {
  // Card hover effects
  const cards = document.querySelectorAll('.premium-card')
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        y: -8,
        scale: 1.02,
        duration: 0.3,
        ease: 'power2.out'
      })
    })

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
    })
  })

  // Button hover effects
  const buttons = document.querySelectorAll('.premium-button')
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      gsap.to(button, {
        scale: 1.05,
        duration: 0.2,
        ease: 'power2.out'
      })
    })

    button.addEventListener('mouseleave', () => {
      gsap.to(button, {
        scale: 1,
        duration: 0.2,
        ease: 'power2.out'
      })
    })
  })
}

/**
 * Initialize component-specific animations
 */
function initComponentAnimations() {
  // Feature cards animation
  gsap.utils.toArray('.feature-card').forEach((card, index) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        end: 'bottom 15%',
        toggleActions: 'play none none reverse'
      },
      x: index % 2 === 0 ? -30 : 30,
      opacity: 0,
      duration: 0.8,
      delay: index * 0.1,
      ease: 'power3.out'
    })
  })

  // Stats counter animation
  const statElements = document.querySelectorAll('.stat-number')
  statElements.forEach(stat => {
    const targetValue = parseInt(stat.textContent)
    stat.textContent = '0'

    ScrollTrigger.create({
      trigger: stat,
      start: 'top 80%',
      onEnter: () => animateCounter(stat, targetValue)
    })
  })

  // Timeline animation
  gsap.utils.toArray('.timeline-item').forEach((item, index) => {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        end: 'bottom 15%',
        toggleActions: 'play none none reverse'
      },
      x: index % 2 === 0 ? -50 : 50,
      opacity: 0,
      duration: 0.8,
      delay: index * 0.15,
      ease: 'power3.out'
    })
  })
}

/**
 * Animate counter from 0 to target value
 */
function animateCounter(element, target) {
  const duration = 2
  const steps = 60
  const increment = target / (duration * steps)
  let current = 0

  const timer = setInterval(() => {
    current += increment
    if (current >= target) {
      current = target
      clearInterval(timer)
    }
    element.textContent = Math.floor(current).toLocaleString()
  }, 1000 / steps)
}

/**
 * Create particle animation for background
 */
export function createParticleAnimation(container) {
  if (!container || typeof window === 'undefined') return

  const particles = []
  const particleCount = 30

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    particle.className = 'absolute rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20'
    particle.style.width = Math.random() * 4 + 1 + 'px'
    particle.style.height = particle.style.width
    particle.style.left = Math.random() * 100 + '%'
    particle.style.top = Math.random() * 100 + '%'
    
    container.appendChild(particle)
    particles.push(particle)
  }

  // Animate particles
  particles.forEach((particle, i) => {
    gsap.to(particle, {
      x: () => Math.random() * 100 - 50,
      y: () => Math.random() * 100 - 50,
      duration: () => Math.random() * 3 + 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: i * 0.1
    })
  })
}

/**
 * Create typing animation for text
 */
export function createTypingAnimation(element, text, speed = 50) {
  if (!element || typeof window === 'undefined') return

  let i = 0
  element.textContent = ''

  function typeWriter() {
    if (i < text.length) {
      element.textContent += text.charAt(i)
      i++
      setTimeout(typeWriter, speed)
    }
  }

  typeWriter()
}

export default {
  initAnimations,
  createParticleAnimation,
  createTypingAnimation
}