<template>
  <div class="about-page-wrapper">
    <!-- Подключаем переиспользуемый хедер навигации -->
    <Header />

    <!-- Секция "Обо мне" -->
    <section id="about" class="about-section">
      <!-- Сетка заголовков (дублирует структуру первого экрана) -->
      <div class="about-grid-header">
        <BrandLink class="about-main-title" />
        <div class="about-sec-title" ref="aboutTitleRef">Обо мне</div>
      </div>

      <!-- Контентная область -->
      <div class="about-content" v-if="!loading && !error">
        <!-- Левая текстовая колонка, получаемая из WYSIWYG-поля title в Directus -->
        <div class="text-container" ref="textContainerRef" v-html="sanitizedTextAbout"></div>

        <!-- Абсолютно позиционированный портрет в правом нижнем углу с компенсацией пустоты PNG -->
        <img
            v-if="photoUrl"
            :src="photoUrl"
            alt="Николай Мацнев"
            class="portrait-img"
        />
      </div>

      <!-- Лоадер на время загрузки данных из CMS -->
      <div class="about-loading" v-else-if="error">
        <span class="loading-text">Не удалось загрузить информацию. Попробуйте обновить страницу.</span>
      </div>

      <div class="about-loading" v-else>
        <span class="loading-text">Загрузка...</span>
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
import { scrambleElementText } from '../utils/textScramble'

const textAbout = ref('')
const photoUrl = ref('')
const loading = ref(true)
const error = ref(false)
const textContainerRef = ref(null)
const aboutTitleRef = ref(null)
const sanitizedTextAbout = computed(() => sanitizeHtml(textAbout.value))
const animationCleanups = []

const fetchAboutData = async () => {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/about?fields=title,photo_about`)
    if (!response.ok) {
      throw new Error(`CMS returned ${response.status}`)
    }

    const { data } = await response.json()

      // Записываем HTML-текст из CMS
      textAbout.value = data.title

      // Умный автоматический резолвер путей изображений для localhost и сервера
      if (data.photo_about) {
        const path = data.photo_about

        if (path.startsWith('http://') || path.startsWith('https://')) {
          photoUrl.value = path
        } else if (path.includes('assets/')) {
          const cleanPath = path.startsWith('/') ? path.slice(1) : path
          photoUrl.value = `${DIRECTUS_URL}/${cleanPath}`
        } else {
          photoUrl.value = assetUrl(path, { width: 1400, quality: 84 })
        }
      }

      // Сначала отключаем лоадер, чтобы Vue смонтировал .text-container в DOM!
      loading.value = false

      // Запускаем дешифрацию строго в следующем тике после монтирования DOM
      nextTick(() => {
        if (textContainerRef.value) {
          animationCleanups.push(scrambleElementText(textContainerRef.value, {
            delay: 120,
            duration: 920,
            stagger: 90,
          }))
          textContainerRef.value.style.opacity = '1'
        }
      })
  } catch (err) {
    console.error('Ошибка при загрузке данных из Directus:', error)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  animationCleanups.push(scrambleElementText(aboutTitleRef.value, {
    delay: 100,
    duration: 700,
  }))
  fetchAboutData()
})

onUnmounted(() => {
  animationCleanups.forEach((cleanup) => cleanup())
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
.about-page-wrapper {
  background: transparent;
  color: #f1f1f0;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

.about-section {
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
.about-grid-header {
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: var(--space-m);
  width: 100%;
}

.about-main-title, .about-sec-title {
  margin: 0;
  padding: 0;
  font-size: 0.72rem; /* Оригинальный мелкий бруталистичный размер хедера */
  font-weight: 400;
  color: #fff;
  letter-spacing: -.04em;
  line-height: 1;
}

@media (max-width: 759px) {
  .about-grid-header {
    grid-template-columns: 1fr;
    gap: var(--space-s);
  }
  .about-main-title, .about-sec-title {
    font-size: 1.25rem;
  }
}

/* Контентная область */
.about-content {
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
  opacity: 0; /* Скрываем текст до старта анимации, чтобы убрать мигание */
  transition: opacity 0.2s ease;
}

@media (min-width: 1024px) {
  .text-container {
    /* Ограничиваем длину строки на широких и 4K-экранах. */
    max-width: min(78%, 1500px) !important;
  }
}

/*
  Абсолютное позиционирование портрета.
  Сдвиг right: -80px полностью нивелирует пустые поля в файле png, прижимая его вплотную к краю.
*/
.portrait-img {
  position: absolute;
  bottom: 0;
  right: -80px; /* Сдвиг на 80px вправо для идеальной компенсации полей в PNG */
  height: 70vh; /* Установили высоту 70% от высоты экрана по макету */
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
.about-loading {
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
  Весь текст (включая цитаты) теперь выводится в едином стиле 20px на десктопе.
*/

/* --- НАСТРОЙКИ ДЛЯ КОМПЬЮТЕРОВ (Шрифт строго 20px, весь текст в одном стиле по вашему макету) --- */
@media (min-width: 760px) {
  html.reference-root-active #about .text-container * {
    font-size: clamp(20px, 1vw, 38px) !important;
    font-weight: 300 !important;
    line-height: 1.6 !important;
    letter-spacing: -0.01em !important;
    word-spacing: 0.12em !important;
    margin: 0 0 16px 0 !important; /* Увеличили отступ пропорционально шрифту */
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }

  /* Восстановление маркеров списка из WYSIWYG на десктопе */
  html.reference-root-active #about .text-container ul {
    list-style: disc !important; /* Возвращаем стандартные круглые маркеры */
    margin: 0 0 28px 0 !important;
    padding-left: 20px !important; /* Добавляем левый отступ, чтобы маркеры влезли */
  }

  html.reference-root-active #about .text-container li {
    font-size: clamp(20px, 1vw, 38px) !important;
    font-weight: 300 !important;
    line-height: 1.6 !important;
    list-style: disc !important; /* Дублируем показ точек */
    margin-bottom: 12px !important; /* Вертикальный отступ между li */
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }
}

/* --- НАСТРОЙКИ ДЛЯ ТЕЛЕФОНОВ (Комфортные 17px, весь текст в одном стиле) --- */
@media (max-width: 759px) {
  html.reference-root-active #about .text-container * {
    font-size: 17px !important;
    font-weight: 300 !important;
    line-height: 1.5 !important;
    letter-spacing: -0.01em !important;
    margin: 0 0 12px 0 !important;
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }

  /* Восстановление маркеров списков на мобильных телефонах */
  html.reference-root-active #about .text-container ul {
    list-style: disc !important;
    margin: 0 0 20px 0 !important;
    padding-left: 20px !important;
  }

  html.reference-root-active #about .text-container li {
    font-size: 17px !important;
    font-weight: 300 !important;
    line-height: 1.5 !important;
    list-style: disc !important;
    margin-bottom: 10px !important;
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
  font-size: clamp(28px, 7.5vw, 58px) !important;
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
    font-size: clamp(36px, 3vw, 116px) !important;
  }
}

html.reference-root-active body {
  min-height: 100vh;
  margin: 0;
  padding: 0;
  font-family: 'Inter', sans-serif !important;
}
</style>
