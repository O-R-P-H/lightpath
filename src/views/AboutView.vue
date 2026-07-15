<template>
  <div class="about-page-wrapper">
    <!-- Подключаем переиспользуемый хедер навигации -->
    <Header />

    <!-- Секция "Обо мне" -->
    <section id="about" class="about-section">
      <!-- Сетка заголовков (дублирует структуру первого экрана) -->
      <div class="about-grid-header">
        <h2 class="about-main-title">
          Студия светового дизайна <br />
          Мацнева Николая
        </h2>
        <div class="about-sec-title">Обо мне</div>
      </div>

      <!-- Контентная область -->
      <div class="about-content" v-if="!loading">
        <!-- Левая текстовая колонка, получаемая из Directus (аккуратный мелкий текст) -->
        <div class="text-container" v-html="textAbout"></div>

        <!-- Абсолютно позиционированный портрет в правом нижнем углу -->
        <img
            v-if="photoUrl"
            :src="photoUrl"
            alt="Николай Мацнев"
            class="portrait-img"
        />
      </div>

      <!-- Лоадер на время загрузки данных из CMS -->
      <div class="about-loading" v-else>
        <span class="loading-text">Загрузка...</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Header from '../components/Header.vue'

const textAbout = ref('')
const photoUrl = ref('')
const loading = ref(true)

const fetchAboutData = async () => {
  try {
    const response = await fetch('https://lightcms.tsukawa.ru/items/about')
    if (response.ok) {
      const { data } = await response.json()

      // Записываем HTML-текст из CMS
      textAbout.value = data.text_about

      // Умный парсер путей изображений для локалхоста и продакшена
      if (data.photo_about) {
        const path = data.photo_about

        // Если путь уже является полной ссылкой, записываем как есть
        if (path.startsWith('http://') || path.startsWith('https://')) {
          photoUrl.value = path
        } else {
          // Если путь относительный (/assets/...), принудительно подставляем домен CMS
          const cleanPath = path.startsWith('/') ? path.slice(1) : path
          photoUrl.value = `https://lightcms.tsukawa.ru/${cleanPath}`
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных из Directus:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  fetchAboutData()
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

.about-page-wrapper {
  background-color: #0e0e0f;
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
}

@media (min-width: 1024px) {
  .text-container {
    /* Ограничиваем ширину текста слева, оставляя правую часть для крупного портрета */
    max-width: 65%;
  }
}

/*
  Абсолютное позиционирование портрета.
  Он всегда прижат к нижнему правому углу, не мешая тексту.
*/
.portrait-img {
  position: absolute;
  bottom: 0;
  right: 0;
  height: 90vh; /* Масштабный величественный портрет по макету */
  width: auto;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}

@media (max-width: 1023px) {
  .portrait-img {
    height: 45vh;
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
  Гарантирует точный мелкий размер текста из Directus (v-html) на любых версиях компиляторов
*/
.text-container p {
  font-size: 15px !important;
  font-weight: 300 !important;
  line-height: 1.6 !important;
  letter-spacing: -0.01em !important;
  word-spacing: 0.12em !important;
  margin: 0 0 1.2rem 0 !important;
  color: #f1f1f0 !important;
  opacity: 0.85 !important;
}

/* Стилизация цитат и вводного текста из CMS (18px) */
.text-container blockquote,
.text-container p:first-of-type {
  font-size: 18px !important;
  font-weight: 400 !important;
  line-height: 1.5 !important;
  margin-bottom: 1.8rem !important;
  color: #fff !important;
  opacity: 1 !important;
}

/* Маркированные списки */
.text-container ul {
  list-style: none !important;
  margin: 0 0 1.8rem 0 !important;
  padding: 0 !important;
}

.text-container li {
  font-size: 15px !important;
  font-weight: 300 !important;
  line-height: 1.6 !important;
  margin-bottom: 0.6rem !important;
  color: #f1f1f0 !important;
  opacity: 0.85 !important;
}

/* Резиновый масштаб страницы и передача глобальных переменных */
html.reference-root-active {
  scroll-behavior: smooth;
  letter-spacing: -.04em;
  background-color: #0e0e0f;
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
  --color-back: #0e0e0f;
  --color-line: #3b3a39;
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
