<template>
  <div class="projects-year-page-wrapper">
    <Header />

    <section class="projects-section">
      <div class="projects-grid" v-if="!loading">
        <!-- Колонка 1: Заголовок страницы -->
        <div class="projects-col-1">
          <BrandLink class="page-title" />
        </div>

        <!-- Колонка 2: Превью-изображение -->
        <div class="projects-col-2">
          <div class="preview-container">
            <transition name="fade">
              <img
                  v-if="hoveredImage"
                  :key="hoveredImage"
                  :src="hoveredImage"
                  alt="Превью проекта"
                  class="preview-img"
                  decoding="async"
                  referrerpolicy="no-referrer"
                  @error="fallbackToOriginalAsset($event, hoveredPreview)"
              />
            </transition>
          </div>
        </div>

        <!-- Колонка 3: Список проектов за этот год (БЕЗ ГОДА СПРАВА) -->
        <div class="projects-col-3">
          <ul class="projects-list">
            <li class="section-column-title">Проекты / {{ year }}</li>

            <li
                v-for="project in yearProjects"
                :key="project.id"
                class="project-row"
                @mouseenter="handleMouseEnter(project)"
            >
              <!-- Клик на Название ведет на детальную страницу -->
              <router-link :to="`/projects/${project.id}`" class="project-title-link">
                <span>{{ project.title }}</span>
              </router-link>
            </li>
          </ul>
        </div>
      </div>

      <!-- Лоадер -->
      <div class="projects-loading" v-else>
        <span class="loading-text">Загрузка проектов...</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import Header from '../components/Header.vue'
import BrandLink from '../components/BrandLink.vue'
import { DIRECTUS_URL, assetUrl, fallbackToOriginalAsset, preloadImage } from '../utils/directus'

const route = useRoute()
const loading = ref(true)
const allProjects = ref([])
const hoveredImage = ref('')
const hoveredPreview = ref('')
const previewUrlCache = new Map()
let previewRequest = 0

const warmProjectPreviews = async (projects) => {
  for (const project of projects) {
    await preloadProjectPreview(project).catch(() => {})
  }
}

const year = computed(() => route.params.year)

const fetchProjects = async () => {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/projects?fields=id,title,year,preview&limit=-1`)
    if (!response.ok) throw new Error(`CMS returned ${response.status}`)
    const { data } = await response.json()
    allProjects.value = data
    window.setTimeout(() => warmProjectPreviews(yearProjects.value), 350)
  } catch (error) {
    console.error('Ошибка получения проектов:', error)
  } finally {
    loading.value = false
    if (yearProjects.value.length > 0) {
      handleMouseEnter(yearProjects.value[0])
    }
  }
}

// Фильтруем все проекты за этот год
const yearProjects = computed(() => {
  return allProjects.value
      .filter(p => p.year === year.value)
      .sort((a, b) => a.id - b.id)
})

const preloadProjectPreview = async (project) => {
  if (!project?.preview) return ''
  if (!previewUrlCache.has(project.id)) {
    const optimizedUrl = assetUrl(project.preview, { width: 900, quality: 82, fit: 'cover', format: 'webp' })
    previewUrlCache.set(project.id, preloadImage(optimizedUrl, assetUrl(project.preview)))
  }
  return previewUrlCache.get(project.id)
}

const handleMouseEnter = async (project) => {
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
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
/* Стили остаются идентичными */
.projects-year-page-wrapper {
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

@media (max-width: 759px) {
  .projects-section {
    min-height: 100svh;
    gap: 28px;
    padding: 16px 20px 48px;
  }

  .projects-grid {
    gap: 24px;
  }

  .projects-col-1 {
    min-width: 0;
    padding-right: 56px;
  }

  .page-title {
    font-size: clamp(18px, 5.2vw, 22px);
  }

}

.preview-container {
  width: 100%;
  aspect-ratio: 1.5;
  background-color: #ffffff05;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

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
}

.project-row {
  display: flex;
  width: 100%;
  border-bottom: 1px solid #1a1a1c;
  box-sizing: border-box;
}

.project-title-link {
  color: var(--color-front, #f1f1f0);
  text-decoration: none;
  width: 100%;
}

.project-title-link > span {
  display: inline-block;
  font-size: clamp(18px, 1.35vw, 54px) !important;
  font-weight: 300 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.02em !important;
  padding: 0.4rem 0 !important;
  transition: transform .3s;
}

@media (hover: hover) {
  .project-title-link:hover > span {
    transform: rotateX(180deg);
  }
}

@media (max-width: 759px) {
  .preview-container {
    aspect-ratio: 4 / 3;
  }

  .section-column-title {
    margin-bottom: 18px;
    font-size: 14px;
  }

  .project-title-link > span {
    max-width: 100%;
    padding: 14px 0 !important;
    font-size: clamp(17px, 4.8vw, 20px) !important;
    line-height: 1.25 !important;
    overflow-wrap: anywhere;
  }

}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
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
