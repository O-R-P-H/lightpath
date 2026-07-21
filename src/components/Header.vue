<template>
  <div>
    <!-- Зафиксированная кнопка "Меню" вверху справа -->
    <div
        class="link m-vertical toggle"
        role="button"
        tabindex="0"
        @click="toggleMenu"
        @keydown.enter="toggleMenu"
    >
      <span>Меню</span>
    </div>

    <!-- Полноэкранный оверлей навигации (Overlay из 3 блоков) -->
    <nav class="overlay" :class="{ 'open': isMenuOpen }">
      <!-- 1. Логотип (Колонка 1) -->
      <div class="overlay-logo">
        <router-link to="/" class="link m-vertical" @click="toggleMenu">
          <span>Студия светового дизайна</span><br />
          <span>Мацнева Николая</span>
        </router-link>
      </div>

      <!-- 2. Пустая колонка для сетки -->
      <div class="overlay-empty"></div>

      <!-- 3. Навигационные ссылки (Клики ведут на ваши роуты страниц) -->
      <ul class="overlay-list svelte-1ri0n2j">
        <li>
          <router-link to="/about" class="link m-vertical" @click="toggleMenu">
            <span>{{ menuAbout }}</span>
          </router-link>
        </li>
        <li>
          <router-link to="/projects" class="link m-vertical" @click="toggleMenu">
            <span>{{ menuProjects }}</span>
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
      </ul>

      <!-- 3. Копирайт (Фиксирован внизу справа) -->
      <div class="copy m-vertical">© 2026</div>
    </nav>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const isMenuOpen = ref(false)

const menuAbout = ref("Обо мне")
const menuProjects = ref("Проекты")
const menuGallery = ref("Услуги")
const menuContacts = ref("Контакты")

const glyphs = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789_*?@#$%+=-"

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

// Эффект расшифровки пунктов меню при его открытии (на русском языке)
watch(isMenuOpen, (isOpen) => {
  if (isOpen) {
    runScramble("Обо мне", menuAbout, 100)
    runScramble("Проекты", menuProjects, 220)
    runScramble("Услуги", menuGallery, 340)
    runScramble("Контакты", menuContacts, 460)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

.hero-wrapper {
  position: relative;
  min-height: 100vh;
  background-color: var(--color-back);
  color: var(--color-front);
  font-family: 'Inter', sans-serif !important;
  overflow: hidden;
}

/* Стили навигации и ссылок */
.link {
  color: var(--color-front, #f1f1f0);
  text-decoration: none;
  position: relative;
  transform: translateZ(0);
  /* Четко ограничиваем хитбокс ссылки по ее контуру во избежание наложений */
  display: inline-block;
  vertical-align: top;
}

.link > span {
  display: inline-block;
  transition: transform .3s;
}

/* Базовые ховер-эффекты для десктопа (только горизонтальный переворот) */
@media (hover: hover) {
  .link:hover {
    cursor: pointer;
  }
  .link:hover > span {
    transform: rotateX(180deg);
  }
}

/*
  ВЕРТИКАЛЬНЫЙ ТЕКСТ И ХОВЕРЫ ДЛЯ МОБИЛЬНЫХ (<= 759px)
  Все мобильные анимации (включая rotateY) изолированы здесь
*/
@media (max-width: 759px) {
  .m-vertical {
    writing-mode: vertical-rl;
    text-align: right;
    transform: rotate(180deg);
    display: inline-block;
  }

  @media (hover: hover) {
    /* На мобильных при наведении переворачиваем строго по вертикальной оси Y */
    .link.m-vertical:hover > span {
      transform: rotateY(180deg) !important;
    }
  }
}

/* Иерархия слоев */
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

/* Полноэкранный оверлей (всегда Grid) */
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

/* Стилизация списка ссылок в меню */
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

  /* На десктопе список в 3-й колонке выстроен по вертикали */
  .overlay-list {
    grid-column-start: 3;
    text-align: left;
    display: block;
  }
}

@media (max-width: 759px) {
  /*
    На мобильных сохраняется оригинальная grid-сетка оверлея.
  */
  .overlay-logo {
    align-self: start;
  }

  /*
    На мобильных список во 2-й колонке выстроен по горизонтали (в ряд).
    align-self: start i align-items: flex-start прижимают элементы
    ровно к верхнему краю сетки, на один уровень с логотипом.
  */
  .overlay-list {
    grid-column-start: 2;
    align-self: start;
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: var(--space-l);
    align-items: flex-start;
  }

  .overlay-list li {
    min-width: 1em;
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
