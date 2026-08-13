<template>
  <div class="project-page-wrapper">
    <Header />

    <section id="project" class="project-section" v-if="!loading && !error && project">
      <!-- Сетка заголовка проекта -->
      <div class="project-grid-header">
        <BrandLink class="project-main-title" />
        <nav class="project-breadcrumbs" aria-label="Навигация по проектам">
          <router-link to="/projects" class="breadcrumb-link">Проекты</router-link>
          <template v-if="project.year">
            <span class="breadcrumb-separator" aria-hidden="true">/</span>
            <router-link :to="projectYearRoute" class="breadcrumb-link">{{ project.year }}</router-link>
          </template>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <span class="breadcrumb-current" aria-current="page" :title="project.title">{{ project.title }}</span>
        </nav>
      </div>

      <!-- Контентная область по макету -->
      <div class="project-content">
        <!-- Левая колонка: Огромный главный слайд -->
        <div class="project-main-image-col">
          <transition name="fade" mode="out-in">
            <video
                v-if="activeMedia?.kind === 'video'"
                :key="activeMedia.id"
                :src="activeMedia.url"
                class="main-project-img main-project-video"
                controls
                playsinline
                preload="metadata"
            ></video>
            <img
                v-else-if="activeMedia"
                :src="activeMedia.displayUrl"
                :key="activeMedia.id"
                alt="Фото проекта"
                class="main-project-img"
                decoding="async"
                fetchpriority="high"
                referrerpolicy="no-referrer"
                @error="fallbackToOriginalAsset($event, activeMedia.id)"
            />
          </transition>
        </div>

        <!-- Правая колонка: Заголовок, описание, слайдер и кнопка заказа -->
        <div class="project-details-col">
          <h1 class="project-title-header">
            {{ project.title }}
            <router-link v-if="project.year" :to="projectYearRoute" class="project-year">{{ project.year }}</router-link>
          </h1>

          <div class="project-order-top">
            <ProjectOrderModal />
          </div>

          <div class="project-details-split">
            <!-- Вертикальный слайдер миниатюр со стрелками -->
            <div class="gallery-slider-wrapper" v-if="galleryItems.length > 0">
              <button type="button" class="slider-arrow up" aria-label="Предыдущее медиа" @click="scrollSlider('up')" :disabled="activeImgIndex === 0">▲</button>

              <div class="thumbnails-container">
                <button
                    v-for="(item, idx) in galleryItems"
                    :key="item.id"
                    type="button"
                    class="thumb-item"
                    :class="{ 'active': idx === activeImgIndex }"
                    @click="setActiveImage(idx)"
                >
                  <video v-if="item.kind === 'video'" :src="item.url" class="thumb-img" muted playsinline preload="metadata"></video>
                  <img v-else :src="item.thumbnailUrl" alt="Миниатюра" class="thumb-img" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error="fallbackToOriginalAsset($event, item.id)" />
                  <span v-if="item.kind === 'video'" class="thumb-video-mark" aria-hidden="true">▶</span>
                  <span class="sr-only">{{ item.kind === 'video' ? 'Видео' : 'Фото' }} {{ idx + 1 }}</span>
                </button>
              </div>

              <button type="button" class="slider-arrow down" aria-label="Следующее медиа" @click="scrollSlider('down')" :disabled="activeImgIndex === galleryItems.length - 1">▼</button>
            </div>

            <!-- Текст описания и кнопка действия -->
            <div class="project-description-block">
              <h3 class="about-label">О проекте:</h3>
              <div class="project-html-content" v-html="sanitizedProjectContent"></div>

            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Лоадер -->
    <div class="project-loading" v-else-if="error">
      <span class="loading-text">Не удалось загрузить проект. Проверьте адрес или попробуйте обновить страницу.</span>
    </div>

    <div class="project-loading" v-else>
      <span class="loading-text">Загрузка информации о проекте...</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Header from '../components/Header.vue'
import BrandLink from '../components/BrandLink.vue'
import ProjectOrderModal from '../components/ProjectOrderModal.vue'
import { sanitizeHtml } from '../utils/sanitize'
import { DIRECTUS_URL, assetUrl, fallbackToOriginalAsset, resolveFile } from '../utils/directus'

const route = useRoute()
const project = ref(null)
const galleryItems = ref([])
const activeImgIndex = ref(0)
const loading = ref(true)
const error = ref(false)
const sanitizedProjectContent = computed(() => sanitizeHtml(project.value?.content))
const activeMedia = computed(() => galleryItems.value[activeImgIndex.value] || null)
const projectYearRoute = computed(() => `/projects/year/${encodeURIComponent(project.value?.year || '')}`)

const toGalleryItem = (file) => ({
  ...file,
  url: assetUrl(file.id),
  displayUrl: file.kind === 'image' ? assetUrl(file.id, { width: 2200, quality: 86, fit: 'inside' }) : assetUrl(file.id),
  thumbnailUrl: file.kind === 'image' ? assetUrl(file.id, { width: 420, height: 280, quality: 78, fit: 'cover' }) : '',
})

const fetchProjectDetails = async () => {
  try {
    const projectId = route.params.id
    const fields = [
      'id', 'title', 'year', 'content',
      'preview.id', 'preview.type', 'preview.filename_download',
      'gallery.directus_files_id.id', 'gallery.directus_files_id.type', 'gallery.directus_files_id.filename_download',
    ].join(',')
    const response = await fetch(`${DIRECTUS_URL}/items/projects/${projectId}?fields=${fields}`)
    if (!response.ok) {
      throw new Error(`CMS returned ${response.status}`)
    }

    const { data } = await response.json()
    if (!data) {
      throw new Error('CMS returned no project data')
    }
    project.value = data

      // Галерея поддерживает изображения и видео из стандартного файлового поля Directus.
      const media = []
      const preview = resolveFile(data.preview)
      if (preview) media.push(preview)
      if (data.gallery && Array.isArray(data.gallery)) {
        data.gallery.forEach(item => {
          const file = resolveFile(item)
          if (file) media.push(file)
        })
      }

      galleryItems.value = Array.from(new Map(media.map(file => [file.id, file])).values()).map(toGalleryItem)
      activeImgIndex.value = 0

      loading.value = false

      nextTick(() => {
        const descContainer = document.querySelector('.project-html-content')
        if (descContainer) {
          descContainer.style.opacity = '1'
        }
      })
  } catch (err) {
    console.error('Ошибка загрузки деталей проекта:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const setActiveImage = (idx) => {
  activeImgIndex.value = idx

  // Умный автоскролл активной миниатюры ровно в центр контейнера слайдера
  nextTick(() => {
    const activeThumb = document.querySelector('.thumb-item.active')
    const container = document.querySelector('.thumbnails-container')
    if (activeThumb && container) {
      const mobileLayout = window.matchMedia('(max-width: 759px)').matches

      if (mobileLayout) {
        const targetScroll = activeThumb.offsetLeft - container.offsetLeft - (container.clientWidth / 2) + (activeThumb.clientWidth / 2)
        container.scrollTo({ left: targetScroll, behavior: 'smooth' })
      } else {
        const targetScroll = activeThumb.offsetTop - container.offsetTop - (container.clientHeight / 2) + (activeThumb.clientHeight / 2)
        container.scrollTo({ top: targetScroll, behavior: 'smooth' })
      }
    }
  })
}

const scrollSlider = (direction) => {
  if (direction === 'up' && activeImgIndex.value > 0) {
    setActiveImage(activeImgIndex.value - 1)
  } else if (direction === 'down' && activeImgIndex.value < galleryItems.value.length - 1) {
    setActiveImage(activeImgIndex.value + 1)
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  fetchProjectDetails()
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
.project-page-wrapper {
  background: transparent;
  color: #f1f1f0;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

.project-section {
  box-sizing: border-box;
  position: relative;
  border-top: 1px solid #3b3a39;
  padding: var(--space-s);
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
  min-height: 100vh;
}

/* Сетка заголовка проекта */
.project-grid-header {
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: var(--space-m);
  width: 100%;
}

.project-main-title,
.project-breadcrumbs {
  margin: 0;
  padding: 0;
  font-size: 0.72rem;
  font-weight: 400;
  color: #fff;
  letter-spacing: -.04em;
  line-height: 1;
}

.project-breadcrumbs {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0.4em;
  min-width: 0;
  padding-right: clamp(5.5rem, 9vw, 9rem);
  white-space: nowrap;
}

.breadcrumb-link,
.project-year {
  color: inherit;
  text-decoration: none;
}

.breadcrumb-link,
.breadcrumb-separator {
  flex: 0 0 auto;
}

.breadcrumb-current {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.5;
}

.breadcrumb-link,
.project-year {
  transition: opacity 180ms ease;
}

@media (hover: hover) {
  .breadcrumb-link:hover,
  .project-year:hover {
    opacity: 0.58;
  }
}

.breadcrumb-link:focus-visible,
.project-year:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 4px;
}

@media (max-width: 759px) {
  .project-section {
    min-height: 100svh;
    gap: 28px;
    padding: 16px 20px 48px;
  }

  .project-grid-header {
    grid-template-columns: 1fr;
    gap: 8px;
    padding-right: 56px;
  }

  .project-main-title,
  .project-breadcrumbs {
    font-size: clamp(18px, 5.2vw, 22px);
  }

  .project-breadcrumbs {
    padding-right: 0;
    line-height: 1.25;
  }
}

/* Контентная область по макету */
.project-content {
  display: grid;
  grid-template-columns: 1fr;
  position: relative;
  flex-grow: 1;
  gap: var(--space-m);
}

@media (min-width: 1024px) {
  .project-content {
    grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.2fr);
  }
}

/* Колонка 1: Главный большой слайд */
.project-main-image-col {
  width: 100%;
  aspect-ratio: 1.5;
  overflow: hidden;
  background-color: #ffffff05;
}

.main-project-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.main-project-video {
  object-fit: contain;
  background: rgba(3, 4, 12, 0.72);
}

/* Колонка 2: Детали проекта */
.project-details-col {
  display: flex;
  flex-direction: column;
}

.project-title-header {
  font-size: clamp(30px, 2.2vw, 84px) !important;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.03em;
  margin: 0 0 1.5rem 0;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.project-order-top {
  margin: 0 0 0.55rem;
}

.project-year {
  opacity: 0.5;
  font-weight: 300;
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .project-title-header {
    font-size: clamp(30px, 2.2vw, 84px) !important;
  }
}

.project-details-split {
  display: flex;
  gap: var(--space-m);
}

/* Вертикальный слайдер со стрелками */
.gallery-slider-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 5.5vw;
  min-width: 55px;
}

.slider-arrow {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
}

.slider-arrow:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

/* Ограничиваем высоту контейнера миниатюр */
.thumbnails-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-height: 42vh; /* Фиксированная высота слайдера */
  overflow-y: scroll;
  scroll-behavior: smooth;
}

.thumb-item {
  width: 100%;
  aspect-ratio: 1.5;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.2s, opacity 0.2s;
  overflow: hidden;
  opacity: 0.4;
  flex-shrink: 0; /* Предотвращаем сжатие картинок внутри прокрутки */
  position: relative;
  padding: 0;
  background: rgba(3, 4, 12, 0.5);
  color: #fff;
}

.thumb-item.active {
  border-color: #fff;
  opacity: 1;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-video-mark {
  position: absolute;
  inset: 50% auto auto 50%;
  display: grid;
  place-items: center;
  width: 1.15rem;
  height: 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  background: rgba(5, 6, 14, 0.58);
  font-size: 0.38rem;
  transform: translate(-50%, -50%);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Блок описания */
.project-description-block {
  flex-grow: 1;
}

.about-label {
  font-size: clamp(15px, 1.1vw, 34px) !important;
  font-weight: 400 !important;
  margin: 0 0 1rem 0;
  letter-spacing: 0;
}

@media (min-width: 1024px) {
  .about-label {
    font-size: clamp(15px, 1.1vw, 34px) !important;
  }
}

.project-html-content {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Кнопка заказа */
.cta-row {
  margin-top: 2rem;
}

/* Стилизация кнопки заказа под макет (без дефолтного синего цвета) */
.cta-link {
  display: inline-block;
  font-size: clamp(15px, 1.1vw, 34px) !important;
  font-weight: 400 !important;
  color: var(--color-front, #f1f1f0) !important; /* Белый цвет текста */
  border: 1px solid var(--color-front, #f1f1f0) !important; /* Белая рамка */
  padding: 0.6rem 1.2rem;
  text-decoration: none !important;
  transition: background-color 0.3s, color 0.3s;
}

@media (hover: hover) {
  .cta-link:hover {
    background-color: var(--color-front, #f1f1f0) !important; /* Полностью белая заливка */
    color: var(--color-back, #0e0e0f) !important; /* Черный текст при ховере */
    cursor: pointer;
  }
}

@media (min-width: 1024px) {
  .cta-link {
    font-size: clamp(15px, 1.1vw, 34px) !important;
  }
}

/* Анимации */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.project-loading {
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
  .project-content {
    gap: 24px;
  }

  .project-main-image-col {
    aspect-ratio: 4 / 3;
  }

  .project-title-header {
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-bottom: 22px;
    font-size: clamp(26px, 8vw, 34px) !important;
    line-height: 1.06;
    overflow-wrap: anywhere;
  }

  .project-year {
    font-size: 16px;
    line-height: 1.2;
  }

  .project-order-top {
    margin-bottom: 24px;
  }

  .project-details-split {
    flex-direction: column;
    gap: 26px;
  }

  .gallery-slider-wrapper {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .slider-arrow {
    display: grid;
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    place-items: center;
    font-size: 14px;
  }

  .slider-arrow.up,
  .slider-arrow.down {
    transform: rotate(-90deg);
  }

  .thumbnails-container {
    flex-direction: row;
    gap: 8px;
    min-width: 0;
    max-height: none;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x proximity;
  }

  .thumb-item {
    width: auto;
    flex: 0 0 clamp(76px, 24vw, 104px);
    scroll-snap-align: center;
  }

  .project-description-block {
    width: 100%;
    min-width: 0;
  }

  .about-label {
    margin-bottom: 14px;
    font-size: 18px !important;
  }

  .project-loading {
    min-height: 100svh;
    padding: 80px 20px 40px;
  }

  .loading-text {
    font-size: 16px;
    line-height: 1.4;
    text-align: center;
  }
}
</style>

<style>
/*
  ГЛОБАЛЬНЫЙ БЛОК СТИЛЕЙ (Unscoped)
  Скрывает полосу прокрутки слайдера и стилизует абзацы
*/

/* Полностью стираем системные скроллбары слайдера во всех браузерах */
.thumbnails-container {
  scrollbar-width: none !important; /* Firefox */
  -ms-overflow-style: none !important; /* IE 10+ */
}

.thumbnails-container::-webkit-scrollbar {
  display: none !important; /* Chrome, Safari, Opera */
  width: 0 !important;
  height: 0 !important;
}

.project-html-content p {
  font-size: clamp(14px, 0.8vw, 30px) !important;
  font-weight: 300 !important;
  line-height: 1.5 !important;
  letter-spacing: -0.01em !important;
  word-spacing: 0.1em !important;
  margin: 0 0 12px 0 !important;
  color: #f1f1f0 !important;
  opacity: 0.85 !important;
}

@media (min-width: 1024px) {
  .project-html-content p {
    font-size: clamp(16px, 0.86vw, 32px) !important;
  }
}

@media (max-width: 759px) {
  .project-html-content p,
  .project-html-content li {
    font-size: 16px !important;
    line-height: 1.5 !important;
  }

  .project-html-content ul,
  .project-html-content ol {
    margin: 0 0 18px;
    padding-left: 20px;
  }
}
</style>
