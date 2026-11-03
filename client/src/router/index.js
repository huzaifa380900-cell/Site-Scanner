import { createRouter, createWebHistory } from 'vue-router'

// Import components
import LandingPage from '../views/LandingPage.vue'
import ScannerApp from '../views/ScannerApp.vue'

const routes = [
  {
    path: '/',
    name: 'LandingPage',
    component: LandingPage,
    meta: {
      title: 'Site Scanner — Free Website Analysis Platform'
    }
  },
  {
    path: '/app',
    name: 'ScannerApp',
    component: ScannerApp,
    meta: {
      title: 'Site Scanner — Dashboard'
    }
  },
  // Catch all redirect to landing page
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash) {
      return { el: to.hash, top: 88, behavior: 'smooth' }
    }

    return { top: 0, behavior: 'smooth' }
  }
})

// Update document title on route change
router.beforeEach((to, from, next) => {
  document.title = to.meta?.title || 'Site Scanner — Website Analysis'
  next()
})

export default router