<template>
  <div class="about-page-wrapper">
    <!-- Подключаем переиспользуемый хедер навигации -->
    <Header />

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
        <!-- Левая текстовая колонка, получаемая из Directus -->
        <div class="text-container" v-html="textAbout"></div>

        <!-- Правая колонка: Портрет Николая Мацнева из Directus -->
        <div class="portrait-container" v-if="photoUrl">
          <img :src="photoUrl" alt="Николай Мацнев" class="portrait-img" />
        </div>
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

      // Записываем HTML-текст
      textAbout.value = data.text_about

      // Формируем абсолютную ссылку на изображение в Directus
      if (data.photo_about) {
        photoUrl.value = `https://lightcms.tsukawa.ru/assets/${data.photo_about}`
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
}

/* Сетка заголовка секции */
.about-grid-header {
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: var(--space-m);
  width: 100%;
}

.about-main-title, .about-sec-title {
  margin: 0;
  padding: 0;
  font-size: 0.72rem;
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
  display: grid;
  grid-template-columns: 1fr;
  position: relative;
  flex-grow: 1;
}

@media (min-width: 1024px) {
  .about-content {
    grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
    gap: var(--space-m);
  }
}

/* Глубокая стилизация динамического HTML из Directus */
.text-container {
  max-width: 100%;
  z-index: 2;
  position: relative;
}

@media (min-width: 1024px) {
  .text-container {
    max-width: 90%;
  }
}

/* Абзацы текста */
.text-container :deep(p) {
  font-size: 1.1rem;
  font-weight: 300;
  line-height: 1.5;
  letter-spacing: -0.01em;
  word-spacing: 0.12em;
  margin: 0 0 1.5rem 0;
  opacity: 0.9;
}

/* Цитаты */
.text-container :deep(blockquote),
.text-container :deep(p:first-of-type) {
  font-size: 1.25rem;
  font-weight: 400;
  line-height: 1.4;
  margin-bottom: 2rem;
}

/* Маркированные списки */
.text-container :deep(ul) {
  list-style: none;
  margin: 0 0 2rem 0;
  padding: 0;
}

.text-container :deep(li) {
  font-size: 1.1rem;
  font-weight: 300;
  line-height: 1.5;
  margin-bottom: 0.8rem;
  opacity: 0.9;
}

/* Изображение портрета */
.portrait-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.portrait-img {
  position: absolute;
  bottom: 0;
  right: 0;
  max-height: 80vh;
  width: auto;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}

@media (max-width: 1023px) {
  .portrait-img {
    max-height: 50vh;
    opacity: 0.25;
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
