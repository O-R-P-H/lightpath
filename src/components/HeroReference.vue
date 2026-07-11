<template>
  <div class="hero-wrapper" ref="heroRef">
    <!-- Фоновый 3D WebGL контейнер (занимает 100% экрана под текстом) -->
    <div class="webgl-canvas" ref="canvasContainer"></div>

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

    <!-- Зафиксированная кнопка "More" внизу справа (прячется под оверлей) -->
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
      <span>Menu</span>
    </div>

    <!-- Полноэкранный оверлей навигации (Overlay из 3 блоков по референсу) -->
    <nav class="overlay" :class="{ 'open': isMenuOpen }">
      <!-- 1. Логотип (Колонка 1) -->
      <div class="overlay-logo">
        <router-link to="/" class="link m-vertical" @click="toggleMenu">
          <span>The studio of Nikolay</span><br />
          <span>Matsnev</span>
        </router-link>
      </div>

      <!-- 2. Навигационные ссылки (На мобильных - Колонка 2, на десктопе - Колонка 3) -->
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

      <!-- 3. Копирайт (Фиксирован внизу справа) -->
      <div class="copy m-vertical">© 2026</div>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

const canvasContainer = ref(null)
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

// Переменные Three.js сценария
let scene, camera, renderer, modelMesh, animationFrameId

const handleResize = () => {
  if (!canvasContainer.value || !camera || !renderer) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
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

  // --- ИНИЦИАЛИЗАЦИЯ THREE.JS ---
  if (canvasContainer.value) {
    const width = canvasContainer.value.clientWidth
    const height = canvasContainer.value.clientHeight

    scene = new THREE.Scene()

    // Настройка камеры
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 10)

    // Рендерер с поддержкой прозрачности (для сочетания с CSS-фоном)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    canvasContainer.value.appendChild(renderer.domElement)

    // --- ДРАМАТИЧЕСКИЙ СВЕТОДИЗАЙН ДЛЯ МОДЕЛИ ---
    // Мягкий базовый заполняющий свет (под цвет фона)
    const ambientLight = new THREE.AmbientLight(0x0e0e0f, 1.0)
    scene.add(ambientLight)

    // Прожектор 1: КРАСНЫЙ (#FF000E) снизу-слева — интенсивность 4.0
    const redSpotlight = new THREE.DirectionalLight(0xff000e, 4.0)
    redSpotlight.position.set(-6, -6, 0)
    scene.add(redSpotlight)

    // Прожектор 2: СВЕРХЧИСТЫЙ БЕЛЫЙ (#FFFFFF) снизу-справа — интенсивность 1.0
    const whiteSpotlight = new THREE.DirectionalLight(0xffffff, 1.0)
    whiteSpotlight.position.set(6, -6, 0)
    scene.add(whiteSpotlight)

    // Загрузка STL модели Родина-Мать
    const loader = new STLLoader()
    loader.load('/models/rodina_volgograd.stl', (geometry) => {
      // Центрируем модель по трем осям, чтобы вращение было идеально ровным
      geometry.center()

      // Материал модели (аккуратный фасетчатый брутализм, красиво ловящий световые пучки)
      const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.75,
        metalness: 0.15,
        flatShading: true // Flat Shading идеально подчеркивает форму граней при игре света
      })

      modelMesh = new THREE.Mesh(geometry, material)

      // STL файлы часто экспортируются лежащими на боку — разворачиваем вертикально по оси X
      modelMesh.rotation.x = -Math.PI / 2
      modelMesh.position.y = 0.5
      modelMesh.rotation.z = - 2.5

      // Автоматически рассчитываем масштаб модели (увеличили коэффициент до 5.8 для большего размера)
      geometry.computeBoundingBox()
      const size = new THREE.Vector3()
      geometry.boundingBox.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scaleFactor = 6.2 / maxDim // Масштабируем до увеличенного размера на экране
      modelMesh.scale.set(scaleFactor, scaleFactor, scaleFactor)

      scene.add(modelMesh)
    })

    // Анимационный цикл
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      if (modelMesh) {
        // Плавное вращение вокруг вертикальной оси (так как модель повернута по X, крутим по Z)
        modelMesh.rotation.z += 0.003
      }

      renderer.render(scene, camera)
    }
    animate()

    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
  window.removeEventListener('resize', handleResize)

  // Очистка памяти WebGL при уходе со страницы
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (renderer) {
    renderer.dispose()
  }
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

/* Фоновый холст 3D WebGL сцены */
.webgl-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1; /* Строго под текстом (z-index: 2) */
  pointer-events: none; /* Пропускает клики на текст и кнопки */
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
    align-self: start и align-items: flex-start прижимают элементы
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
