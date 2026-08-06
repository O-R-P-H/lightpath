<template>
  <div class="hero-wrapper">
    <Header />

    <header class="hero-header">
      <router-link to="/" class="hero-home-link" aria-label="На главную">
        <h1 class="hero-title">
          <span class="scramble-line">{{ titleLine1 }}</span>
          <br />
          <span class="scramble-line">{{ titleLine2 }}</span>
        </h1>
      </router-link>

      <ul class="hero-list" aria-label="Направления студии">
        <li v-for="(tag, index) in scrambledTags" :key="index">
          {{ tag }}
        </li>
      </ul>
    </header>

    <main class="scene-explorer" aria-label="Подбор светового решения">
      <nav class="fixture-filter" aria-label="Зона освещения">
        <button
          v-for="option in fixtureOptions"
          :key="option"
          class="filter-button"
          :class="{ active: option === selectedFixture }"
          type="button"
          :aria-pressed="option === selectedFixture"
          @click="selectFixture(option)"
        >
          {{ option }}
        </button>
      </nav>

      <aside class="temperature-filter" aria-label="Сценарий света">
        <button
          v-for="option in temperatureOptions"
          :key="option"
          class="filter-button"
          :class="{ active: option === selectedTemperature }"
          type="button"
          :aria-pressed="option === selectedTemperature"
          @click="selectTemperature(option)"
        >
          {{ option }}
        </button>
      </aside>

      <div class="scene-frame" :style="{ backgroundColor: placeholderColor }">
        <Transition name="scene-fade" mode="out-in">
          <img
            v-if="currentScene?.image"
            :key="currentScene.id"
            class="scene-image"
            :src="currentImageUrl"
            :alt="`${selectedFixture} — ${selectedTemperature}`"
            @error="fallbackToOriginalAsset($event, currentScene.image)"
          />
          <div v-else key="placeholder" class="solid-placeholder" aria-hidden="true"></div>
        </Transition>
        <span class="visually-hidden" aria-live="polite">
          {{ currentScene?.image ? `${selectedFixture}, ${selectedTemperature}` : 'Однотонная заглушка' }}
        </span>
      </div>
    </main>

    <router-link class="link m-vertical more" to="/about">
      <span>Подробнее</span>
    </router-link>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Header from '../components/Header.vue'
import { DIRECTUS_URL, assetUrl, fallbackToOriginalAsset } from '../utils/directus.js'

const DEFAULT_TITLE = 'Студия светового дизайна\nМацнева Николая'
const DEFAULT_FIXTURES = ['Болларды', 'Ступени', 'Забор', 'Деревья/кусты', 'Фасадные', 'Линейные']
const DEFAULT_TEMPERATURES = ['Дневной белый', 'Нейтральный белый', 'Теплый белый', 'Янтарный']
const DEFAULT_PLACEHOLDER_COLOR = '#171821'
const TARGET_TAGS = [
  'Светодизайн', 'Архитектура', 'Атмосфера', 'Концепт',
  'Инженерия', 'Искусство', 'Пространство', 'Влияние',
]
const GLYPHS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789_*?@#$%+=-'

const [targetTitleLine1, targetTitleLine2] = DEFAULT_TITLE.split('\n')
const titleLine1 = ref('')
const titleLine2 = ref('')
const scrambledTags = ref(TARGET_TAGS.map(() => ''))
const fixtureOptions = ref(DEFAULT_FIXTURES)
const temperatureOptions = ref(DEFAULT_TEMPERATURES)
const placeholderColor = ref(DEFAULT_PLACEHOLDER_COLOR)
const scenes = ref([])
const selectedFixture = ref(DEFAULT_FIXTURES[0])
const selectedTemperature = ref(DEFAULT_TEMPERATURES[0])
const abortController = new AbortController()
const scrambleTimeouts = []
const scrambleIntervals = []

const runScramble = (targetText, reactiveRef, delay = 0) => {
  const timeout = window.setTimeout(() => {
    let iterations = 0
    const maxIterations = targetText.length + 4
    const interval = window.setInterval(() => {
      reactiveRef.value = targetText
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' '
          if (index < iterations - 3) return char
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        })
        .join('')

      iterations += 1
      if (iterations >= maxIterations) {
        window.clearInterval(interval)
        reactiveRef.value = targetText
      }
    }, 55)

    scrambleIntervals.push(interval)
  }, delay)

  scrambleTimeouts.push(timeout)
}

const currentScene = computed(() => (
  scenes.value.find((scene) => (
    scene.fixture === selectedFixture.value
    && scene.temperature === selectedTemperature.value
    && scene.image
  )) || null
))

const currentImageUrl = computed(() => assetUrl(currentScene.value?.image, {
  width: 2400,
  height: 1600,
  fit: 'cover',
  quality: 90,
  format: 'webp',
}))

const parseOptions = (value, fallback) => {
  const options = String(value || '')
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)

  return options.length ? [...new Set(options)] : fallback
}

const parseColor = (value) => {
  const color = String(value || '').trim()
  return /^#[\da-f]{3,8}$/i.test(color) ? color : DEFAULT_PLACEHOLDER_COLOR
}

const selectFixture = (fixture) => {
  selectedFixture.value = fixture
}

const selectTemperature = (temperature) => {
  selectedTemperature.value = temperature
}

const loadHomepage = async () => {
  const query = new URLSearchParams({
    fields: 'fixture_filters,temperature_filters,placeholder_color,scenes.id,scenes.sort,scenes.fixture_filter,scenes.temperature_filter,scenes.image',
    'deep[scenes][_sort]': 'sort',
    _: String(Date.now()),
  })

  try {
    const response = await fetch(`${DIRECTUS_URL}/items/homepage?${query}`, {
      cache: 'no-store',
      signal: abortController.signal,
    })
    if (!response.ok) throw new Error(`Directus responded with ${response.status}`)

    const payload = await response.json()
    const data = payload?.data || {}

    fixtureOptions.value = parseOptions(data.fixture_filters, DEFAULT_FIXTURES)
    temperatureOptions.value = parseOptions(data.temperature_filters, DEFAULT_TEMPERATURES)
    placeholderColor.value = parseColor(data.placeholder_color)
    selectedFixture.value = fixtureOptions.value[0]
    selectedTemperature.value = temperatureOptions.value[0]
    scenes.value = Array.isArray(data.scenes)
      ? data.scenes.map((scene) => ({
        id: scene.id,
        fixture: String(scene.fixture_filter || '').trim(),
        temperature: String(scene.temperature_filter || '').trim(),
        image: scene.image || '',
      }))
      : []
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Не удалось загрузить главную страницу из Directus:', error)
    }
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  loadHomepage()
  runScramble(targetTitleLine1, titleLine1, 150)
  runScramble(targetTitleLine2, titleLine2, 450)

  TARGET_TAGS.forEach((tag, index) => {
    const reactiveWrapper = {
      get value() { return scrambledTags.value[index] },
      set value(value) { scrambledTags.value[index] = value },
    }
    runScramble(tag, reactiveWrapper, 750 + index * 120)
  })
})

onUnmounted(() => {
  abortController.abort()
  scrambleTimeouts.forEach((timeout) => window.clearTimeout(timeout))
  scrambleIntervals.forEach((interval) => window.clearInterval(interval))
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
.hero-wrapper {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: var(--color-front);
  background: transparent;
}

.hero-header {
  position: absolute;
  top: var(--space-s);
  right: 0;
  left: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: var(--space-m);
  padding: 0 var(--space-s);
  pointer-events: none;
}

.hero-home-link {
  display: block;
  width: fit-content;
  color: inherit;
  text-decoration: none;
  pointer-events: auto;
}

.hero-title,
.hero-list {
  margin: 0;
  padding: 0;
  color: #fff;
  font-weight: 400;
  letter-spacing: -.02em;
  line-height: 1;
  mix-blend-mode: difference;
  pointer-events: auto;
}

.hero-title {
  font-size: 1rem;
}

.scramble-line {
  white-space: nowrap;
}

.hero-list {
  list-style: none;
  font-size: clamp(16px, 1.2vw, 46px);
  line-height: 1.08;
}

.hero-list li {
  min-height: 1.08em;
  margin-bottom: .15em;
}

.scene-explorer {
  display: grid;
  grid-template-columns: minmax(0, 40.5vw) minmax(220px, 24vw);
  grid-template-rows: auto auto;
  column-gap: 1vw;
  align-content: end;
  min-height: 100vh;
  padding: max(150px, 16vh) 0 clamp(24px, 3vh, 64px) clamp(32px, 3vw, 96px);
}

.scene-frame {
  position: relative;
  grid-column: 1;
  grid-row: 1;
  aspect-ratio: 1.5 / 1;
  overflow: hidden;
}

.scene-image,
.solid-placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.scene-image {
  object-fit: cover;
}

.solid-placeholder {
  background: inherit;
}

.fixture-filter {
  grid-column: 1;
  grid-row: 2;
  display: flex;
  flex-wrap: wrap;
  gap: clamp(15px, 1.7vw, 68px);
  align-items: baseline;
  padding-top: clamp(16px, 2.4vh, 52px);
}

.temperature-filter {
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 5.2vh, 112px);
}

.filter-button {
  appearance: none;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  color: rgba(241, 241, 240, .56);
  background: none;
  font: inherit;
  font-size: clamp(15px, 1.1vw, 42px);
  font-weight: 400;
  letter-spacing: -.015em;
  line-height: 1.1;
  text-align: left;
  transition: color .25s ease, opacity .25s ease;
}

.filter-button.active,
.filter-button:hover {
  color: #fff;
}

.link {
  position: relative;
  color: var(--color-front);
  text-decoration: none;
  transform: translateZ(0);
}

.link > span {
  display: inline-block;
  transition: transform .3s;
}

.more {
  position: fixed;
  right: var(--space-s);
  bottom: var(--space-s);
  z-index: 3;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.scene-fade-enter-active,
.scene-fade-leave-active {
  transition: opacity .35s ease;
}

.scene-fade-enter-from,
.scene-fade-leave-to {
  opacity: 0;
}

@media (hover: hover) {
  .link:hover > span {
    transform: rotateX(180deg);
  }
}

@media (max-width: 1024px) and (min-width: 760px) {
  .scene-explorer {
    grid-template-columns: minmax(0, 54vw) minmax(180px, 30vw);
    column-gap: 5vw;
  }

}

@media (max-width: 759px) {
  .hero-wrapper {
    min-height: 100svh;
    overflow: visible;
  }

  .hero-header {
    position: relative;
    top: auto;
    right: auto;
    left: auto;
    grid-template-columns: 1fr;
    gap: clamp(22px, 6vh, 46px);
    padding: var(--space-s) calc(var(--space-s) + 54px) 0 var(--space-s);
  }

  .hero-title {
    font-size: clamp(18px, 5.4vw, 32px);
    line-height: 1;
  }

  .hero-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 16px;
    font-size: clamp(14px, 4vw, 18px);
  }

  .scene-explorer {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: 20px;
    align-content: start;
    min-height: auto;
    padding: clamp(42px, 9vh, 76px) var(--space-s) 116px;
  }

  .scene-frame {
    grid-column: 1;
    grid-row: 3;
    aspect-ratio: 1.22 / 1;
  }

  .fixture-filter {
    grid-column: 1;
    grid-row: 1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 14px;
    padding-top: 0;
  }

  .temperature-filter {
    grid-column: 1;
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 14px;
    margin-top: 0;
    padding-top: 24px;
    border-top: 1px solid rgba(241, 241, 240, .16);
  }

  .filter-button {
    font-size: clamp(14px, 4.2vw, 18px);
  }

  .m-vertical {
    display: inline-block;
    text-align: right;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-fade-enter-active,
  .scene-fade-leave-active,
  .link > span,
  .filter-button {
    transition: none;
  }
}
</style>
