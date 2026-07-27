import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../views/MainView.vue'
import AboutView from '../views/AboutView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import ProjectView from '../views/ProjectView.vue'
import ProjectsYearView from '../views/ProjectsYearView.vue'
import ContactsView from '../views/ContactsView.vue'
import ServicesView from '../views/ServicesView.vue' // Новый импорт страницы услуг

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
      path: '/projects',
      name: 'projects-archive',
      component: ProjectsView,
    },
    {
      path: '/project-template',
      name: 'projects-archive-legacy',
      component: ProjectsView,
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectView,
    },
    {
      path: '/projects/year/:year',
      name: 'projects-by-year',
      component: ProjectsYearView,
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: ContactsView,
    },
    {
      /* Ссылка Услуги (gallery в коде) теперь открывает полноценную страницу услуг */
      path: '/gallery',
      name: 'services',
      component: ServicesView,
    }
  ],
})

export default router
