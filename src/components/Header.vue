<template>
  <div>
    <!-- Зафиксированная кнопка "Меню" вверху справа -->
    <div
        class="link m-vertical toggle"
        role="button"
        tabindex="0"
        :aria-expanded="isMenuOpen"
        :aria-label="isMenuOpen ? 'Закрыть меню' : 'Открыть меню'"
        @click="toggleMenu"
        @keydown.enter="toggleMenu"
        @keydown.space.prevent="toggleMenu"
    >
      <span>Меню</span>
    </div>

    <!-- Полноэкранный оверлей навигации (Overlay из 3 блоков) -->
    <nav class="overlay" :class="{ 'open': isMenuOpen }">
      <!-- 1. Логотип (Колонка 1) -->
      <div class="overlay-logo">
        <BrandLink class="overlay-brand" @click="toggleMenu" />
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
import { onUnmounted, ref, watch } from 'vue'
import BrandLink from './BrandLink.vue'

const isMenuOpen = ref(false)
let previousOverflow = ''
let bodyScrollLocked = false

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
    if (window.matchMedia('(max-width: 759px)').matches) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      bodyScrollLocked = true
    }
    runScramble("Обо мне", menuAbout, 100)
    runScramble("Проекты", menuProjects, 220)
    runScramble("Услуги", menuGallery, 340)
    runScramble("Контакты", menuContacts, 460)
  } else if (bodyScrollLocked) {
    document.body.style.overflow = previousOverflow
    bodyScrollLocked = false
  }
})

onUnmounted(() => {
  if (bodyScrollLocked) document.body.style.overflow = previousOverflow
})
</script>

<style scoped>
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
  right: max(var(--space-s), env(safe-area-inset-right));
  top: max(var(--space-s), env(safe-area-inset-top));
  z-index: 10; /* Находится поверх оверлея */
}

/* Полноэкранный оверлей (всегда Grid) */
.overlay {
  z-index: 5; /* Покрывает кнопку More, но остается под кнопкой Menu/Close */
  background:
    radial-gradient(circle at 18% 18%, rgba(91, 89, 182, 0.18), transparent 36%),
    rgba(7, 8, 18, 0.96);
  backdrop-filter: blur(18px);
  gap: var(--space-m);
  padding:
    max(var(--space-s), env(safe-area-inset-top))
    max(var(--space-s), env(safe-area-inset-right))
    max(var(--space-s), env(safe-area-inset-bottom))
    max(var(--space-s), env(safe-area-inset-left));

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

.overlay-brand {
  font-size: 1rem;
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
  .toggle {
    top: max(16px, env(safe-area-inset-top));
    right: max(16px, env(safe-area-inset-right));
  }

  .overlay {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 28px 16px;
    padding:
      max(16px, env(safe-area-inset-top))
      max(20px, env(safe-area-inset-right))
      max(22px, env(safe-area-inset-bottom))
      max(20px, env(safe-area-inset-left));
  }

  .overlay-logo {
    grid-column: 1;
    grid-row: 1;
    align-self: start;
    min-width: 0;
    padding-right: 44px;
  }

  .overlay-brand {
    font-size: clamp(17px, 5vw, 21px);
  }

  .overlay-empty {
    display: none;
  }

  .overlay-list {
    grid-column: 1 / -1;
    grid-row: 2;
    align-self: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0;
    width: 100%;
  }

  .overlay-list li {
    min-width: 0;
    border-bottom: 1px solid rgba(241, 241, 240, 0.16);
  }

  .overlay-list li:first-child {
    border-top: 1px solid rgba(241, 241, 240, 0.16);
  }

  .overlay-list .m-vertical {
    display: block;
    padding: 12px 0 10px;
    font-size: clamp(34px, 11vw, 48px);
    line-height: 0.95;
    text-align: left;
    writing-mode: horizontal-tb;
    transform: none;
  }

  .copy {
    position: static;
    grid-column: 1 / -1;
    grid-row: 3;
    justify-self: end;
    font-size: 14px;
    writing-mode: horizontal-tb;
    transform: none;
  }
}
</style>

<style>
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
