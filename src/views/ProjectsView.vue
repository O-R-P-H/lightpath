<template>
  <div class="projects-page-wrapper">
    <Header />

    <section class="projects-section">
      <div class="projects-grid" v-if="!loading">
        <!-- Колонка 1: Заголовок страницы -->
        <div class="projects-col-1">
          <h2 class="page-title">Все проекты</h2>
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
            />
          </div>
        </div>

        <!-- Колонка 3: Список проектов (is_in_menu: true) -->
        <div class="projects-col-3">
          <ul class="projects-list">
            <li class="section-column-title" ref="listTitleRef">Проекты</li>

            <li
                v-for="project in primaryProjects"
                :key="project.id"
                class="project-row"
                @mouseenter="handleMouseEnter(project, $event)"
            >
              <!--
                ПРАВКА КЛИЕНТА: Клик на Название теперь ведет
                в год проекта (/projects/year/:year), а не в сам проект!
              -->
              <router-link :to="`/projects/year/${project.year}`" class="project-title-link">
                <span>{{ project.title }}</span>
              </router-link>

              <!-- Клик на Год также ведет на страницу проектов этого года -->
              <router-link :to="`/projects/year/${project.year}`" class="project-year-link">
                <span>{{ project.year }}</span>
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
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import Header from '../components/Header.vue'

const loading = ref(true)
const allProjects = ref([])
const hoveredImage = ref('')
const hoveredRowTop = ref(0)
const listTitleRef = ref(null)

const fetchProjects = async () => {
  try {
    const response = await fetch(`https://lightcms.tsukawa.ru/items/projects?t=${Date.now()}`)
    if (response.ok) {
      const { data } = await response.json()
      allProjects.value = data
    }
  } catch (error) {
    console.error('Ошибка получения проектов из Directus:', error)
  } finally {
    loading.value = false

    // Инициализируем первое превью по умолчанию
    nextTick(() => {
      if (primaryProjects.value.length > 0) {
        hoveredImage.value = `https://lightcms.tsukawa.ru/assets/${primaryProjects.value[0].preview}`

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
      .filter(p => p.is_in_menu && p.year)
      .sort((a, b) => parseInt(b.year) - parseInt(a.year))
})

// Наведение мыши: меняем картинку и плавно перемещаем контейнер по вертикали
const handleMouseEnter = (project, event) => {
  if (project.preview) {
    hoveredImage.value = `https://lightcms.tsukawa.ru/assets/${project.preview}`
  }

  if (event && event.currentTarget) {
    // Вычисляем точное смещение строки относительно родительского списка UL
    hoveredRowTop.value = event.currentTarget.offsetTop
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
.projects-page-wrapper {
  background-color: #0e0e0f;
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

@media (max-width: 759px) {
  .page-title {
    font-size: 1.25rem;
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
  font-size: 1.35vw !important;
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
  .project-title-link > span, .project-year-link > span {
    font-size: 1.1rem !important;
    padding: 0.6rem 0 !important;
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
</style>

<style>
/* Резиновый масштаб страницы */
html.reference-root-active {
  scroll-behavior: smooth;
  letter-spacing: -.04em;
  background-color: #0e0e0f;
  margin: 0;
  padding: 0;
  font-size: 7.5vw !important;
  line-height: 1 !important;
  font-family: 'Inter', sans-serif !important;
}

@media (min-width: 760px) {
  html.reference-root-active {
    font-size: 3vw !important;
  }
}

html.reference-root-active body {
  min-height: 100vh;
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif !important;
}
</style>
