<template>
  <div class="project-page-wrapper">
    <Header />

    <section id="project" class="project-section" v-if="!loading && project">
      <!-- Сетка заголовка проекта -->
      <div class="project-grid-header">
        <h2 class="project-main-title">
          Студия светового дизайна <br />
          Мацнева Николая
        </h2>
        <div class="project-sec-title">Проекты {{ project.year ? `/ ${project.year}` : '' }}</div>
      </div>

      <!-- Контентная область по макету -->
      <div class="project-content">
        <!-- Левая колонка: Огромный главный слайд -->
        <div class="project-main-image-col">
          <transition name="fade" mode="out-in">
            <img
                :src="activeImage"
                :key="activeImage"
                alt="Фото проекта"
                class="main-project-img"
            />
          </transition>
        </div>

        <!-- Правая колонка: Заголовок, описание, слайдер и кнопка заказа -->
        <div class="project-details-col">
          <h1 class="project-title-header">
            {{ project.title }} <span class="project-year">{{ project.year }}</span>
          </h1>

          <div class="project-details-split">
            <!-- Вертикальный слайдер миниатюр со стрелками -->
            <div class="gallery-slider-wrapper" v-if="galleryUrls.length > 0">
              <button class="slider-arrow up" @click="scrollSlider('up')" :disabled="activeImgIndex === 0">▲</button>

              <div class="thumbnails-container">
                <div
                    v-for="(url, idx) in galleryUrls"
                    :key="idx"
                    class="thumb-item"
                    :class="{ 'active': idx === activeImgIndex }"
                    @click="setActiveImage(idx)"
                >
                  <img :src="url" alt="Миниатюра" class="thumb-img" />
                </div>
              </div>

              <button class="slider-arrow down" @click="scrollSlider('down')" :disabled="activeImgIndex === galleryUrls.length - 1">▼</button>
            </div>

            <!-- Текст описания и кнопка действия -->
            <div class="project-description-block">
              <h3 class="about-label">О проекте:</h3>
              <div class="project-html-content" v-html="project.content"></div>

              <!-- Кнопка заказа -->
              <div class="cta-row">
                <a href="#contacts" class="cta-link link">
                  <span>Заказать проект освещения</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Лоадер -->
    <div class="project-loading" v-else>
      <span class="loading-text">Загрузка информации о проекте...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Header from '../components/Header.vue'

const route = useRoute()
const project = ref(null)
const galleryUrls = ref([])
const activeImgIndex = ref(0)
const activeImage = ref('')
const loading = ref(true)

const glyphs = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789_*?@#$%+=-"

const getTextNodes = (node) => {
  const textNodes = []
  const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false)
  let currentNode = walk.nextNode()
  while (currentNode) {
    if (currentNode.nodeValue.trim().length > 0) {
      textNodes.push(currentNode)
    }
    currentNode = walk.nextNode()
  }
  return textNodes
}

const scrambleHTMLContent = (containerElement) => {
  const textNodes = getTextNodes(containerElement)
  textNodes.forEach((node, nodeIndex) => {
    const originalText = node.nodeValue
    const length = originalText.length
    let currentFrame = 0
    const totalFrames = 25
    const delay = nodeIndex * 80

    setTimeout(() => {
      const interval = setInterval(() => {
        currentFrame++
        const progress = currentFrame / totalFrames

        node.nodeValue = originalText
            .split("")
            .map((char, index) => {
              if (char === " " || char === "\n") return char
              const charThreshold = index / length
              if (progress >= charThreshold) return char
              return glyphs[Math.floor(Math.random() * glyphs.length)]
            })
            .join("")

        if (currentFrame >= totalFrames) {
          clearInterval(interval)
          node.nodeValue = originalText
        }
      }, 30)
    }, delay)
  })
}

const fetchProjectDetails = async () => {
  try {
    const projectId = route.params.id
    const response = await fetch(`https://lightcms.tsukawa.ru/items/projects/${projectId}?fields=*,gallery.*`)
    if (response.ok) {
      const { data } = await response.json()
      project.value = data

      // Собираем галерею картинок (превью + вложенные файлы)
      const urls = []
      if (data.preview) {
        urls.push(`https://lightcms.tsukawa.ru/assets/${data.preview}`)
      }
      if (data.gallery && Array.isArray(data.gallery)) {
        data.gallery.forEach(item => {
          const fileId = typeof item === 'object' && item !== null
              ? (item.directus_files_id || item.id)
              : item
          if (fileId) {
            urls.push(`https://lightcms.tsukawa.ru/assets/${fileId}`)
          }
        })
      }

      galleryUrls.value = urls
      if (urls.length > 0) {
        activeImage.value = urls[0]
      }

      loading.value = false

      nextTick(() => {
        const descContainer = document.querySelector('.project-html-content')
        if (descContainer) {
          descContainer.style.opacity = '1'
          scrambleHTMLContent(descContainer)
        }
      })
    }
  } catch (err) {
    console.error('Ошибка загрузки деталей проекта:', err)
    loading.value = false
  }
}

const setActiveImage = (idx) => {
  activeImgIndex.value = idx
  activeImage.value = galleryUrls.value[idx]

  // Умный автоскролл активной миниатюры ровно в центр контейнера слайдера
  nextTick(() => {
    const activeThumb = document.querySelector('.thumb-item.active')
    const container = document.querySelector('.thumbnails-container')
    if (activeThumb && container) {
      const targetScroll = activeThumb.offsetTop - container.offsetTop - (container.clientHeight / 2) + (activeThumb.clientHeight / 2)
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      })
    }
  })
}

const scrollSlider = (direction) => {
  if (direction === 'up' && activeImgIndex.value > 0) {
    setActiveImage(activeImgIndex.value - 1)
  } else if (direction === 'down' && activeImgIndex.value < galleryUrls.value.length - 1) { // Исправлено на .value.length
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
  background-color: #0e0e0f;
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

.project-main-title, .project-sec-title {
  margin: 0;
  padding: 0;
  font-size: 0.72rem;
  font-weight: 400;
  color: #fff;
  letter-spacing: -.04em;
  line-height: 1;
}

@media (max-width: 759px) {
  .project-grid-header {
    grid-template-columns: 1fr;
    gap: var(--space-s);
  }
  .project-main-title, .project-sec-title {
    font-size: 1.25rem;
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

/* Колонка 2: Детали проекта */
.project-details-col {
  display: flex;
  flex-direction: column;
}

.project-title-header {
  font-size: 30px !important;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.03em;
  margin: 0 0 1.5rem 0;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.project-year {
  opacity: 0.5;
  font-weight: 300;
}

@media (min-width: 1024px) {
  .project-title-header {
    font-size: 2.2vw !important;
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

/* Блок описания */
.project-description-block {
  flex-grow: 1;
}

.about-label {
  font-size: 15px !important;
  font-weight: 400 !important;
  margin: 0 0 1rem 0;
}

@media (min-width: 1024px) {
  .about-label {
    font-size: 1.1vw !important;
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
  font-size: 15px !important;
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
    font-size: 1.1vw !important;
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
  font-size: 14px !important;
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
    font-size: 1vw !important; /* Тонкий изящный текст */
  }
}
</style>
