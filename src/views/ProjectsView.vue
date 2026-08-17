<template>
  <div class="projects-page-wrapper">
    <Header />

    <section class="projects-section">
      <div class="projects-grid" v-if="!loading">
        <!-- Колонка 1: Заголовок страницы -->
        <div class="projects-col-1">
          <BrandLink class="page-title" />
        </div>

        <!-- Колонка 2: Компактная превью-картинка по макету -->
        <div class="projects-col-2">
          <div
              class="preview-container"
              :style="{ top: `${hoveredRowTop}px` }"
          >
            <img
                v-if="hoveredImage"
                :src="hoveredImage"
                alt="Превью проекта"
                class="preview-img"
                decoding="async"
                referrerpolicy="no-referrer"
                @error="fallbackToOriginalAsset($event, hoveredPreview)"
            />
          </div>
        </div>

        <!-- Колонка 3: Список проектов (is_in_menu: true) -->
        <div class="projects-col-3">
          <ul class="projects-list" ref="projectsListRef">
            <li class="section-column-title" ref="listTitleRef">Проекты</li>

            <li
                v-for="project in primaryProjects"
                :key="project.id"
                class="project-row"
                @mouseenter="handleMouseEnter(project, $event)"
            >
              <!-- Название открывает проект, год — архив проектов за этот год. -->
              <a :href="`/projects/${project.id}`" class="project-title-link">
                <span>{{ project.title }}</span>
              </a>

              <!-- Клик на Год также ведет на страницу проектов этого года -->
              <a v-if="project.year" :href="`/projects/year/${project.year}`" class="project-year-link">
                <span>{{ project.year }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Лоадер -->
      <div class="projects-loading" v-else>
        <span class="loading-text">Загрузка проектов...</span>
      </div>

      <div class="projects-order">
        <ProjectOrderModal />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import Header from '../components/Header.vue'
import BrandLink from '../components/BrandLink.vue'
import ProjectOrderModal from '../components/ProjectOrderModal.vue'
import { DIRECTUS_URL, assetUrl, fallbackToOriginalAsset, preloadImage } from '../utils/directus'
import { scrambleElementText } from '../utils/textScramble'

const loading = ref(true)
const allProjects = ref([])
const hoveredImage = ref('')
const hoveredPreview = ref('')
const hoveredRowTop = ref(0)
const listTitleRef = ref(null)
const projectsListRef = ref(null)
const animationCleanups = []
const previewUrlCache = new Map()
let previewRequest = 0

const warmProjectPreviews = async (projects) => {
  for (const project of projects) {
    await preloadProjectPreview(project).catch(() => {})
  }
}

const animateProjectTitles = () => {
  if (listTitleRef.value) {
    animationCleanups.push(scrambleElementText(listTitleRef.value, {
      delay: 80,
      duration: 650,
    }))
  }

  const titleElements = projectsListRef.value?.querySelectorAll('.project-title-link > span') || []
  titleElements.forEach((element, index) => {
    animationCleanups.push(scrambleElementText(element, {
      delay: 180 + index * 120,
      duration: 850,
    }))
  })
}

const fetchProjects = async () => {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/projects?fields=id,title,year,is_in_menu,preview&limit=-1`)
    if (!response.ok) throw new Error(`CMS returned ${response.status}`)
    const { data } = await response.json()
    allProjects.value = data
    window.setTimeout(() => warmProjectPreviews(primaryProjects.value), 350)
  } catch (error) {
    console.error('Ошибка получения проектов из Directus:', error)
  } finally {
    loading.value = false

    // Инициализируем первое превью по умолчанию
    nextTick(() => {
      animateProjectTitles()

      if (primaryProjects.value.length > 0) {
        setHoveredPreview(primaryProjects.value[0])

        // Позиционируем превью напротив первой строки на старте
        setTimeout(() => {
          const firstRow = document.querySelector('.project-row')
          if (firstRow) {
            hoveredRowTop.value = firstRow.offsetTop
          }
        }, 100)
      }
    })
  }
}

// Фильтруем проекты, которые должны быть в меню (is_in_menu === true)
const primaryProjects = computed(() => {
  return allProjects.value
      .filter(p => p.is_in_menu)
      .sort((a, b) => {
        const yearDifference = (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0)
        return yearDifference || String(a.title || '').localeCompare(String(b.title || ''), 'ru')
      })
})

// Наведение мыши: меняем картинку и плавно перемещаем контейнер по вертикали
const handleMouseEnter = (project, event) => {
  if (project.preview) {
    setHoveredPreview(project)
  }

  if (event && event.currentTarget) {
    // Вычисляем точное смещение строки относительно родительского списка UL
    hoveredRowTop.value = event.currentTarget.offsetTop
  }
}

const preloadProjectPreview = async (project) => {
  if (!project?.preview) return ''
  if (!previewUrlCache.has(project.id)) {
    const optimizedUrl = assetUrl(project.preview, { width: 800, quality: 82, fit: 'cover', format: 'webp' })
    previewUrlCache.set(project.id, preloadImage(optimizedUrl, assetUrl(project.preview)))
  }
  return previewUrlCache.get(project.id)
}

const setHoveredPreview = async (project) => {
  const requestId = ++previewRequest
  try {
    const loadedUrl = await preloadProjectPreview(project)
    if (!loadedUrl || requestId !== previewRequest) return
    hoveredPreview.value = project.preview
    hoveredImage.value = loadedUrl
  } catch (error) {
    if (requestId === previewRequest) console.error('Не удалось загрузить превью проекта:', error)
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  fetchProjects()
})

onUnmounted(() => {
  animationCleanups.forEach((cleanup) => cleanup())
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
.projects-page-wrapper {
  background: transparent;
  color: #f1f1f0;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

.projects-section {
  box-sizing: border-box;
  position: relative;
  border-top: 1px solid #3b3a39;
  padding: var(--space-s);
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
  min-height: 100vh;
}

.projects-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-m);
  width: 100%;
  flex-grow: 1;
  position: relative;
}

@media (min-width: 760px) {
  .projects-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.8fr);
    align-items: start;
  }
}

.page-title {
  margin: 0;
  padding: 0;
  font-size: 0.72rem;
  font-weight: 400;
  color: #fff;
  letter-spacing: -.04em;
  line-height: 1;
}

.projects-order {
  position: fixed;
  left: var(--space-s);
  bottom: var(--space-s);
  z-index: 4;
}

@media (max-width: 759px) {
  .projects-section {
    min-height: 100svh;
    gap: 32px;
    padding: 16px 20px 104px;
  }

  .projects-grid {
    gap: 32px;
  }

  .projects-col-1 {
    min-width: 0;
    padding-right: 56px;
  }

  .page-title {
    font-size: clamp(18px, 5.2vw, 22px);
  }

  .projects-col-3 {
    min-width: 0;
  }
}

/* Колонка 2: Относительный контейнер для абсолютного позиционирования превью */
.projects-col-2 {
  position: relative;
  height: 100%;
  width: 100%;
  display: none;
}

@media (min-width: 760px) {
  .projects-col-2 {
    display: block;
    /*
      Выравниваем базовую линию колонки с первой строкой списка
      (высота заголовка колонки "Проекты" 0.72rem + 2rem margin)
    */
    padding-top: calc(0.72rem + 2rem);
  }
}

/* Компактное превью плавно скользящее по оси Y */
.preview-container {
  position: absolute;
  width: 80% !important;
  max-width: 290px !important;
  aspect-ratio: 1.5;
  background-color: #ffffff05;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  left: 10%; /* Центрируем по ширине */

  /* Плавное скольжение по вертикали за курсором */
  transition: top 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/*
  На 4K-экранах стандартный лимит 290px делает превью слишком маленьким
  относительно сетки каталога. Увеличиваем только на широких вьюпортах,
  сохраняя центрирование и поведение на обычных десктопах.
*/
@media (min-width: 2200px) {
  .preview-container {
    width: min(38vw, 1450px) !important;
    max-width: none !important;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* Колонка 3 */
.section-column-title {
  font-size: 0.72rem;
  font-weight: 400;
  color: #fff;
  letter-spacing: -.04em;
  margin-bottom: 2rem;
  opacity: 0.5;
}

.projects-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.project-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
  border-bottom: 1px solid #1a1a1c;
  box-sizing: border-box;
}

.project-title-link, .project-year-link {
  color: var(--color-front, #f1f1f0);
  text-decoration: none;
}

.project-title-link > span, .project-year-link > span {
  display: inline-block;
  font-size: clamp(18px, 1.35vw, 54px) !important;
  font-weight: 300 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.02em !important;
  padding: 0.4rem 0 !important;
  transition: transform .3s;
}

@media (hover: hover) {
  .project-title-link:hover > span, .project-year-link:hover > span {
    transform: rotateX(180deg);
  }
}

@media (max-width: 759px) {
  .section-column-title {
    margin-bottom: 18px;
    font-size: 14px;
  }

  .project-row {
    align-items: flex-start;
    gap: 12px;
  }

  .project-title-link {
    min-width: 0;
    flex: 1 1 auto;
  }

  .project-year-link {
    flex: 0 0 auto;
  }

  .project-title-link > span,
  .project-year-link > span {
    padding: 14px 0 !important;
    line-height: 1.25 !important;
  }

  .project-title-link > span {
    max-width: 100%;
    font-size: clamp(17px, 4.8vw, 20px) !important;
    overflow-wrap: anywhere;
  }

  .project-year-link > span {
    padding-top: 16px !important;
    color: rgba(241, 241, 240, 0.56);
    font-size: 14px !important;
  }

  .projects-order {
    left: 20px;
    bottom: max(16px, env(safe-area-inset-bottom));
  }

}

.projects-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  min-height: 50vh;
}

.loading-text {
  font-size: 1.2rem;
  font-weight: 300;
  opacity: 0.5;
}

@media (max-width: 759px) {
  .projects-loading {
    min-height: 70svh;
    padding: 24px;
  }

  .loading-text {
    font-size: 16px;
    line-height: 1.4;
    text-align: center;
  }
}
</style>

<style>
/* Резиновый масштаб страницы */
html.reference-root-active {
  scroll-behavior: smooth;
  letter-spacing: -.04em;
  background-color: #090a16;
  margin: 0;
  padding: 0;
  font-size: clamp(28px, 7.5vw, 58px) !important;
  line-height: 1 !important;
  font-family: 'Inter', sans-serif !important;
}

@media (min-width: 760px) {
  html.reference-root-active {
    font-size: clamp(36px, 3vw, 116px) !important;
  }
}

@media (min-width: 2600px) {
  html.reference-root-active {
    font-size: clamp(116px, 4vw, 168px) !important;
  }
}

html.reference-root-active body {
  min-height: 100vh;
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif !important;
}
</style>
