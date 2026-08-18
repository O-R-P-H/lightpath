import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')

const rotorSelectors = {
  home: '.hero-list a',
  about: '.text-container',
  'projects-archive': '.project-row',
  'projects-archive-legacy': '.project-row',
  'projects-by-year': '.project-row',
  'project-detail': '.project-title-header',
  contacts: '.contact-item',
  services: '.service-navigation-item',
}

let rotorTimer = 0

const waitForRenderedContent = (routeName) => {
  if (!window.YandexRotorSettings) return
  window.clearInterval(rotorTimer)
  window.YandexRotorSettings.IsLoaded = false
  window.YandexRotorSettings.IsError = false
  const selector = rotorSelectors[routeName]
  let attempts = 0
  rotorTimer = window.setInterval(() => {
    attempts += 1
    const element = selector ? document.querySelector(selector) : document.querySelector('#app')
    const hasContent = element && element.textContent.trim().length > 0
    if (hasContent || attempts >= 40) {
      window.YandexRotorSettings.IsLoaded = true
      window.clearInterval(rotorTimer)
    }
  }, 200)
}

router.afterEach((to) => {
  waitForRenderedContent(to.name)
})
