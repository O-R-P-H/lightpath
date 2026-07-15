import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../views/MainView.vue'
import AboutView from "@/views/AboutView.vue"; // Страница с копией

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Main',
      component: MainView,
    },
    {
      path: '/about',
      name: 'Abot',
      component: AboutView,
    }
  ],
})

export default router
