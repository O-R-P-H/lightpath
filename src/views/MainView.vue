<template>
  <div class="hero-wrapper" ref="heroRef">
    <!-- Фоновый 3D WebGL контейнер (занимает 100% экрана под текстом) -->
    <div class="webgl-canvas" ref="canvasContainer"></div>

    <!-- Подключаем переиспользуемый хедер навигации -->
    <Header />

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

    <!-- Зафиксированная кнопка "Подробнее" (ведет на роут /about) -->
    <router-link class="link m-vertical more" to="/about">
      <span>Подробнее</span>
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import Header from '../components/Header.vue'

const canvasContainer = ref(null)

const targetTitleLine1 = "Студия Николая"
const targetTitleLine2 = "Мацнева"

const targetTags = [
  'Светодизайн', 'Дизайн', 'Архитектура', 'Атмосфера',
  'Концепт', 'Инженерия', 'Искусство', 'Пространства', 'Влияние'
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

    // --- ХУДОЖЕСТВЕННЫЙ СВЕТОДИЗАЙН ДЛЯ МОДЕЛИ ---
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

    /*
      --- СЮДА МОЖНО ИМПОРТИРОВАТЬ ВАШУ НОВУЮ МОДЕЛЬ ---
      Например, используя GLTFLoader:

      import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
      const loader = new GLTFLoader()
      loader.load('/models/my_new_model.gltf', (gltf) => {
         modelMesh = gltf.scene
         scene.add(modelMesh)
      })
    */

    // Анимационный цикл
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      if (modelMesh) {
        // Плавное вращение вокруг вертикальной оси Y
        modelMesh.rotation.y += 0.003
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

.hero-wrapper {
  position: relative;
  min-height: 100vh;
  background-color: var(--color-back);
  color: var(--color-front);
  font-family: 'Inter', sans-serif !important;
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
  font-weight: 400; /* Вернули исходную толщину Regular */
  color: #fff;
  mix-blend-mode: difference;
  z-index: 2;
  pointer-events: none;
  letter-spacing: -.02em; /* Чистая и аккуратная плотность */
  word-spacing: 0.12em; /* Свободное расстояние между словами */
  line-height: 1;
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
