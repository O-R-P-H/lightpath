<template>
  <div class="hero-wrapper">
    <!-- Основной Херо-блок -->
    <header class="hero-header">
      <h1 class="hero-title">
        <span class="scramble-line">{{ titleLine1 }}</span>
        <br />
        <span class="scramble-line">{{ titleLine2 }}</span>
      </h1>

      <ul class="hero-list">
        <li v-for="(tag, index) in scrambledTags" :key="index">
          {{ tag }}
        </li>
      </ul>
    </header>

    <!-- Зафиксированная кнопка "More" внизу справа (прячется под оверлей при его открытии) -->
    <a class="link m-vertical more" href="#about">
      <span>More</span>
    </a>

    <!-- Зафиксированная кнопка "Menu/Close" вверху справа -->
    <div
        class="link m-vertical toggle"
        role="button"
        tabindex="0"
        @click="toggleMenu"
        @keydown.enter="toggleMenu"
    >
      <span>{{ isMenuOpen ? 'Close' : 'Menu' }}</span>
    </div>

    <!-- Полноэкранный оверлей навигации (Overlay) -->
    <nav class="overlay" :class="{ 'open': isMenuOpen }">
      <!-- Колонка 1: Логотип -->
      <div class="overlay-logo">
        <router-link to="/" class="link m-vertical" @click="toggleMenu">
          <span>The studio of Nikolay</span><br />
          <span>Matsnev</span>
        </router-link>
      </div>

      <!-- Колонка 2: Пустая -->
      <div class="overlay-empty"></div>

      <!-- Колонка 3: Навигационные ссылки (в точности по вашему CSS из DevTools) -->
      <ul class="overlay-list svelte-1ri0n2j">
        <li>
          <router-link to="/about" class="link m-vertical" @click="toggleMenu">
            <span>{{ menuAbout }}</span>
          </router-link>
        </li>
        <li>
          <router-link to="/gallery" class="link m-vertical" @click="toggleMenu">
            <span>{{ menuGallery }}</span>
          </router-link>
        </li>
        <li>
          <router-link to="/contacts" class="link m-vertical" @click="toggleMenu">
            <span>{{ menuContacts }}</span>
          </router-link>
        </li>
        <li>
          <router-link to="/project-template" class="link m-vertical" @click="toggleMenu">
            <span>{{ menuProjects }}</span>
          </router-link>
        </li>
      </ul>

      <!-- Копирайт внизу справа -->
      <div class="copy m-vertical">© 2026</div>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const isMenuOpen = ref(false)

const targetTitleLine1 = "The studio of Nikolay"
const targetTitleLine2 = "Matsnev"

const targetTags = [
  'Lighting', 'Design', 'Architecture', 'Atmosphere',
  'Concept', 'Engineering', 'Art', 'Lightscapes', 'Impact'
]

// Текстовые переменные для анимации главного экрана
const titleLine1 = ref("")
const titleLine2 = ref("")
const scrambledTags = ref(targetTags.map(() => ""))

// Текстовые переменные для анимации ссылок в меню
const menuAbout = ref("About")
const menuGallery = ref("Gallery")
const menuContacts = ref("Contacts")
const menuProjects = ref("Projects")

const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_*?@#$%+=-"

// Интервальный алгоритм с поочередным открытием букв
const runScramble = (targetText, reactiveRef, delay = 0) => {
  setTimeout(() => {
    let iterations = 0
    const maxIterations = targetText.length + 4

    const interval = setInterval(() => {
      reactiveRef.value = targetText
          .split("")
          .map((char, index) => {
            if (char === " ") return " "

            if (index < iterations - 3) {
              return char
            }

            return glyphs[Math.floor(Math.random() * glyphs.length)]
          })
          .join("")

      iterations++

      if (iterations >= maxIterations) {
        clearInterval(interval)
        reactiveRef.value = targetText
      }
    }, 55)
  }, delay)
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// Эффект расшифровки пунктов меню при его открытии
watch(isMenuOpen, (isOpen) => {
  if (isOpen) {
    runScramble("About", menuAbout, 100)
    runScramble("Gallery", menuGallery, 220)
    runScramble("Contacts", menuContacts, 340)
    runScramble("Projects", menuProjects, 460)
  }
})

onMounted(() => {
  // Включаем резиновый размер шрифта и переменные на тег <html>
  document.documentElement.classList.add('reference-root-active')

  // Плавный запуск анимации перебора символов при загрузке страницы
  runScramble(targetTitleLine1, titleLine1, 150)
  runScramble(targetTitleLine2, titleLine2, 450)

  targetTags.forEach((tag, index) => {
    const reactiveWrapper = {
      get value() { return scrambledTags.value[index] },
      set value(v) { scrambledTags.value[index] = v }
    }
    runScramble(tag, reactiveWrapper, 750 + index * 120)
  })
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
/* Локальное подключение шрифта .woff */
@font-face {
  font-family: 'Apfel Grotezk';
  src: url('/fonts/ApfelGrotezk-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

.hero-wrapper {
  position: relative;
  min-height: 100vh;
  background-color: var(--color-back);
  color: var(--color-front);
  font-family: 'Apfel Grotezk', sans-serif;
  overflow: hidden;
}

/* Сетка шапки */
.hero-header {
  box-sizing: border-box;
  gap: var(--space-m);
  min-height: 100vh;
  align-content: start;
  display: grid;
  position: relative;
  overflow: hidden;
  padding: var(--space-s);
}

.hero-title, .hero-list {
  margin: 0;
  padding: 0;
  font-size: 1rem; /* Масштабируется динамически через VW */
  font-weight: 400;
  color: #fff;
  mix-blend-mode: difference;
  z-index: 2;
  pointer-events: none;
  letter-spacing: -.04em;
  line-height: 1;
}

.hero-list {
  list-style: none;
}

/* Стили навигации и вертикального текста */
.link {
  color: var(--color-front);
  text-decoration: none;
  position: relative;
  transform: translateZ(0);
}

.link > span {
  display: inline-block;
  transition: transform .3s;
}

/*
  ВЕРТИКАЛЬНЫЙ ТЕКСТ (m-vertical)
  Применяется СТРОГО на мобильных устройствах (<= 759px).
  На десктопе он автоматически становится горизонтальным!
*/
@media (max-width: 759px) {
  .m-vertical {
    writing-mode: vertical-rl;
    text-align: right;
    transform: rotate(180deg);
    display: inline-block;
  }
}

@media (hover: hover) {
  .link:hover {
    cursor: pointer;
  }
  .link:hover > span {
    transform: rotateX(180deg);
  }
  /* На мобильных при наведении переворачиваем по вертикальной оси */
  .link.m-vertical:hover > span {
    transform: rotateY(180deg);
  }
}

/*
  Иерархия слоев в абсолютной точности с оригиналом.
  More лежит ниже оверлея, Menu/Close лежит выше оверлея.
*/
.more {
  position: fixed;
  right: var(--space-s);
  bottom: var(--space-s);
  z-index: 3; /* Скрывается под оверлеем */
}

.toggle {
  position: fixed;
  right: var(--space-s);
  top: var(--space-s);
  z-index: 10; /* Находится поверх оверлея */
}

/* Полноэкранный оверлей */
.overlay {
  z-index: 5; /* Покрывает кнопку More, но остается под кнопкой Menu/Close */
  background-color: var(--color-back);
  gap: var(--space-m);
  padding: var(--space-s);

  /* Плавный переход видимости */
  visibility: hidden;
  opacity: 0;
  transition: opacity .5s, visibility .5s;

  grid-template-columns: repeat(3, 1fr);
  display: grid;
  position: fixed;
  inset: 0;
  box-sizing: border-box;
}

.overlay.open {
  visibility: visible;
  opacity: 1;
}

/* Стилизация списка ссылок в меню в точности по вашим свойствам */
.overlay-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.overlay-list li {
  margin: 0;
  padding: 0;
}

.copy {
  position: fixed;
  bottom: var(--space-s);
  right: var(--space-s);
}

/* Адаптивная верстка */
@media (min-width: 760px) {
  .hero-header {
    grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  }

  .overlay {
    grid-template-columns: repeat(3, 1fr);
  }

  /*
    На десктопе список в точности повторяет свойства из консоли референса:
    никакого Flexbox, обычное последовательное блочное расположение со сдвигом в 3 колонку.
  */
  .overlay-list {
    grid-column-start: 3;
    text-align: left; /* Текст выровнен по левому краю внутри третьей колонки (аккуратно левее кнопки) */
  }
}

@media (max-width: 759px) {
  .overlay {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .overlay-list {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    align-items: center;
  }
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
}
</style>
