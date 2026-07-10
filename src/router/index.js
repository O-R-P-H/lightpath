import { createRouter, createWebHistory } from 'vue-router'
import SelectionView from '../views/SelectionView.vue'
import CustomHeroView from '../views/CustomHeroView.vue' // Ваша текущая страница
import ReferenceHeroView from '../views/ReferenceHeroView.vue' // Страница с копией

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'selection',
      component: SelectionView,
    },
    {
      path: '/custom',
      name: 'custom-design',
      component: CustomHeroView,
    },
    {
      path: '/reference',
      name: 'reference-design',
      component: ReferenceHeroView,
    }
  ],
})

export default router
