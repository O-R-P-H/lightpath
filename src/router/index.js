import { createRouter, createWebHistory } from 'vue-router'
import { applyRouteSeo } from '../utils/seo'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: () => import('../views/MainView.vue') },
    { path: '/about', name: 'about', component: () => import('../views/AboutView.vue') },
    { path: '/projects', name: 'projects-archive', component: () => import('../views/ProjectsView.vue') },
    { path: '/project-template', name: 'projects-archive-legacy', component: () => import('../views/ProjectsView.vue') },
    { path: '/projects/:id', name: 'project-detail', component: () => import('../views/ProjectView.vue') },
    { path: '/projects/year/:year', name: 'projects-by-year', component: () => import('../views/ProjectsYearView.vue') },
    { path: '/contacts', name: 'contacts', component: () => import('../views/ContactsView.vue') },
    { path: '/gallery', name: 'services', component: () => import('../views/ServicesView.vue') },
  ],
})

router.afterEach((to) => {
  applyRouteSeo(to)
})

export default router
