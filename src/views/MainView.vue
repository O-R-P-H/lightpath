<template>
  <div class="hero-wrapper" ref="heroRef">
    <!-- Подключаем переиспользуемый хедер навигации -->
    <Header />

    <!-- Основной Херо-блок -->
    <header class="hero-header">
      <router-link to="/" class="hero-home-link" aria-label="На главную">
        <h1 class="hero-title">
          <span class="scramble-line">{{ titleLine1 }}</span>
          <br />
          <span class="scramble-line">{{ titleLine2 }}</span>
        </h1>
      </router-link>

      <ul class="hero-list">
        <li v-for="(tag, index) in scrambledTags" :key="index">
          {{ tag }}
        </li>
      </ul>
    </header>

    <!-- Зафиксированная кнопка "Подробнее" (ведет на роут /about) -->
    <router-link class="link m-vertical more" to="/about">
      <span>Подробнее</span>
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Header from '../components/Header.vue'

const targetTitleLine1 = "Студия светового дизайна "
const targetTitleLine2 = "Мацнева Николая"

const targetTags = [
  'Светодизайн', 'Архитектура', 'Атмосфера',
  'Концепт', 'Инженерия', 'Искусство', 'Пространство', 'Влияние'
]

// Текстовые переменные для анимации главного экрана
const titleLine1 = ref("")
const titleLine2 = ref("")
const scrambledTags = ref(targetTags.map(() => ""))

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

onMounted(() => {
  // Включаем резиновый масштаб страницы и переменные на тег <html>
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
.hero-wrapper {
  position: relative;
  min-height: 100vh;
  background: transparent;
  color: var(--color-front);
  font-family: 'Inter', sans-serif !important;
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
  font-weight: 400; /* Вернули исходную толщину Regular */
  color: #fff;
  mix-blend-mode: difference;
  z-index: 2;
  pointer-events: auto;
  letter-spacing: -.02em; /* Чистая и аккуратная плотность */
  word-spacing: 0.12em; /* Свободное расстояние между словами */
  line-height: 1;
}

.hero-home-link {
  display: block;
  width: fit-content;
  color: inherit;
  text-decoration: none;
  z-index: 2;
}

.scramble-line {
  white-space: nowrap;
}

@media (max-width: 480px) {
  .hero-title {
    font-size: clamp(15px, 4.5vw, 22px);
  }
}

.hero-list {
  list-style: none;
}

/* Увеличенный вертикальный отступ между тегами */
.hero-list li {
  margin-bottom: 0.18rem;
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

/* Иерархия слоев */
.more {
  position: fixed;
  right: var(--space-s);
  bottom: var(--space-s);
  z-index: 3; /* Скрывается под оверлеем */
}

/* Адаптивная верстка */
@media (min-width: 760px) {
  .hero-header {
    grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  }
}
</style>
