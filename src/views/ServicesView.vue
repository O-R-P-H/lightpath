<template>
  <div class="services-page-wrapper">
    <!-- Подключаем переиспользуемый хедер навигации -->
    <Header />

    <!-- Секция "Услуги" -->
    <section id="services" class="services-section">
      <!-- Сетка заголовков (дублирует структуру первого экрана) -->
      <div class="services-grid-header">
        <BrandLink class="services-main-title" />
        <div class="services-sec-title">Услуги</div>
      </div>

      <!-- Контентная область -->
      <div class="services-content" v-if="!loading && !error">
        <!-- Левая текстовая колонка, получаемая из WYSIWYG-поля title в Directus -->
        <div class="text-container" ref="textContainerRef" v-html="sanitizedTextServices"></div>

        <!-- Абсолютно позиционированный портрет в правом нижнем углу с компенсацией пустоты PNG -->
        <img
            v-if="photoUrl"
            :src="photoUrl"
            alt="Услуги"
            class="portrait-img"
        />
      </div>

      <!-- Лоадер на время загрузки данных из CMS -->
      <div class="services-loading" v-else-if="error">
        <span class="loading-text">Не удалось загрузить услуги. Попробуйте обновить страницу.</span>
      </div>

      <div class="services-loading" v-else>
        <span class="loading-text">Загрузка услуг...</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import Header from '../components/Header.vue'
import BrandLink from '../components/BrandLink.vue'
import { sanitizeHtml } from '../utils/sanitize'
import { DIRECTUS_URL, assetUrl } from '../utils/directus'

const textServices = ref('')
const photoUrl = ref('')
const loading = ref(true)
const error = ref(false)
const textContainerRef = ref(null)
const sanitizedTextServices = computed(() => sanitizeHtml(textServices.value))

const fetchServicesData = async () => {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/services?fields=title,photo_services`)
    if (!response.ok) {
      throw new Error(`CMS returned ${response.status}`)
    }

    const { data } = await response.json()

      // Записываем HTML-текст из поля title в вашей коллекции services
      textServices.value = data.title

      // Автоматический резолвер путей изображений для localhost и сервера
      if (data.photo_services) {
        const path = data.photo_services

        if (path.startsWith('http://') || path.startsWith('https://')) {
          photoUrl.value = path
        } else if (path.includes('assets/')) {
          const cleanPath = path.startsWith('/') ? path.slice(1) : path
          photoUrl.value = `${DIRECTUS_URL}/${cleanPath}`
        } else {
          photoUrl.value = assetUrl(path, { width: 1400, quality: 84 })
        }
      }

      loading.value = false

      nextTick(() => {
        if (textContainerRef.value) {
          textContainerRef.value.style.opacity = '1'
        }
      })
  } catch (err) {
    console.error('Ошибка при загрузке данных об услугах из Directus:', error)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  fetchServicesData()
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
.services-page-wrapper {
  background: transparent;
  color: #f1f1f0;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

.services-section {
  box-sizing: border-box;
  position: relative;
  border-top: 1px solid #3b3a39;
  padding: var(--space-s);
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
  min-height: 100vh;
}

/* Сетка заголовка секции (идентична шапке) */
.services-grid-header {
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: var(--space-m);
  width: 100%;
}

.services-main-title, .services-sec-title {
  margin: 0;
  padding: 0;
  font-size: 0.72rem;
  font-weight: 400;
  color: #fff;
  letter-spacing: -.04em;
  line-height: 1;
}

@media (max-width: 759px) {
  .services-grid-header {
    grid-template-columns: 1fr;
    gap: var(--space-s);
  }
  .services-main-title, .services-sec-title {
    font-size: 1.25rem;
  }
}

/* Контентная область */
.services-content {
  position: relative;
  z-index: 2;
  width: 100%;
  margin-top: var(--space-m);
  flex-grow: 1;
}

.text-container {
  width: 100%;
  position: relative;
  z-index: 2;
  opacity: 0; /* Скрываем текст до старта анимации */
  transition: opacity 0.2s ease;
}

@media (min-width: 1024px) {
  .text-container {
    max-width: 78% !important; /* Роскошная широкая колонка по макету */
  }
}

/*
  Абсолютное позиционирование портрета/обложки.
  Сдвиг right: -80px компенсирует пустые поля в файле png, прижимая его вплотную к краю.
*/
.portrait-img {
  position: absolute;
  bottom: 0;
  right: -80px;
  height: 70vh; /* Установлена оригинальная высота 70% от высоты экрана */
  width: auto;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}

@media (max-width: 1023px) {
  .portrait-img {
    height: 45vh;
    right: -20px;
    opacity: 0.25; /* Полупрозрачный фон на телефонах во избежание перекрытия */
  }
}

/* Стилизация лоадера загрузки */
.services-loading {
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
  Защищает верстку от огромных 40px шрифтов.
  Весь текст выводится в едином стиле 20px на десктопе и 17px на мобильных.
*/

/* --- НАСТРОЙКИ ДЛЯ КОМПЬЮТЕРОВ (Шрифт строго 20px, весь текст в одном стиле по вашему макету) --- */
@media (min-width: 760px) {
  html.reference-root-active #services .text-container * {
    font-size: clamp(20px, 1vw, 38px) !important;
    font-weight: 300 !important;
    line-height: 1.6 !important;
    letter-spacing: -0.01em !important;
    word-spacing: 0.12em !important;
    margin: 0 0 12px 0 !important;
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }

  /* Восстановление маркеров списка из WYSIWYG на десктопе */
  html.reference-root-active #services .text-container ul {
    list-style: disc !important;
    margin: 0 0 24px 0 !important;
    padding-left: 20px !important;
  }

  html.reference-root-active #services .text-container li {
    font-size: clamp(20px, 1vw, 38px) !important;
    font-weight: 300 !important;
    line-height: 1.6 !important;
    list-style: disc !important;
    margin-bottom: 10px !important;
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }
}

/* --- НАСТРОЙКИ ДЛЯ ТЕЛЕФОНОВ (Комфортные 17px, весь текст в одном стиле) --- */
@media (max-width: 759px) {
  html.reference-root-active #services .text-container * {
    font-size: 17px !important;
    font-weight: 300 !important;
    line-height: 1.5 !important;
    letter-spacing: -0.01em !important;
    margin: 0 0 10px 0 !important;
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }

  /* Восстановление маркеров списков на мобильных телефонах */
  html.reference-root-active #services .text-container ul {
    list-style: disc !important;
    margin: 0 0 20px 0 !important;
    padding-left: 20px !important;
  }

  html.reference-root-active #services .text-container li {
    font-size: 17px !important;
    font-weight: 300 !important;
    line-height: 1.5 !important;
    list-style: disc !important;
    margin-bottom: 8px !important;
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }
}

/* Резиновый масштаб страницы и передача глобальных переменных */
html.reference-root-active {
  scroll-behavior: smooth;
  letter-spacing: -.04em;
  background-color: #090a16;
  margin: 0;
  padding: 0;
  font-size: 7.5vw !important;
  line-height: 1 !important;

  /* Принудительно перебиваем шрифт на Inter для всех дочерних элементов */
  font-family: 'Inter', sans-serif !important;

  /* Передаем переменные глобально */
  --space-s: .2rem;
  --space-m: .66rem;
  --space-l: 1rem;
  --color-front: #f1f1f0;
  --color-back: #090a16;
  --color-line: rgba(180, 182, 224, 0.22);
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
