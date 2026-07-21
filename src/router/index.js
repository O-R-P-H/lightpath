import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../views/MainView.vue'
import AboutView from '../views/AboutView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import ProjectView from '../views/ProjectView.vue'
import ProjectsYearView from '../views/ProjectsYearView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      /* Основной рабочий путь для страницы всех проектов */
      path: '/projects',
      name: 'projects-archive',
      component: ProjectsView,
    },
    {
      /* Дублирующий альтернативный путь (для совместимости со старыми ссылками) */
      path: '/project-template',
      name: 'projects-archive-legacy',
      component: ProjectsView,
    },
    {
      /* Детальная страница конкретного проекта */
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectView,
    },
    {
      /* Страница со списком всех проектов за выбранный год */
      path: '/projects/year/:year',
      name: 'projects-by-year',
      component: ProjectsYearView,
    },
    {
      /* Временная заглушка для роута /gallery (Услуги в хедере) */
      path: '/gallery',
      name: 'services',
      component: () => import('../views/AboutView.vue'),
    },
    {
      /* Временная заглушка для роута /contacts (Контакты в хедере) */
      path: '/contacts',
      name: 'contacts',
      component: () => import('../views/AboutView.vue'),
    }
  ],
})

export default router
