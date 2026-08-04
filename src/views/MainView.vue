<template>
  <div class="hero-wrapper">
    <Header />

    <header class="hero-heading">
      <router-link to="/" class="hero-home-link" aria-label="На главную">
        <h1 class="hero-title">
          <span v-for="line in titleLines" :key="line">{{ line }}</span>
        </h1>
      </router-link>
    </header>

    <nav class="hero-nav" aria-label="Основная навигация">
      <router-link to="/about">Обо мне</router-link>
      <router-link to="/projects">Проекты</router-link>
      <router-link to="/gallery">Услуги</router-link>
      <router-link to="/contacts">Контакты</router-link>
    </nav>

    <main class="scene-explorer" aria-label="Подбор светового решения">
      <section class="visual-column">
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
      </section>

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
    </main>

    <div class="copy" aria-label="Копирайт">© 2026</div>
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

const pageTitle = ref(DEFAULT_TITLE)
const fixtureOptions = ref(DEFAULT_FIXTURES)
const temperatureOptions = ref(DEFAULT_TEMPERATURES)
const placeholderColor = ref(DEFAULT_PLACEHOLDER_COLOR)
const scenes = ref([])
const selectedFixture = ref(DEFAULT_FIXTURES[0])
const selectedTemperature = ref(DEFAULT_TEMPERATURES[0])
const abortController = new AbortController()

const titleLines = computed(() => {
  const lines = pageTitle.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.length ? lines : DEFAULT_TITLE.split('\n')
})

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
    fields: 'title,fixture_filters,temperature_filters,placeholder_color,scenes.id,scenes.sort,scenes.fixture_filter,scenes.temperature_filter,scenes.image',
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

    pageTitle.value = String(data.title || '').trim() || DEFAULT_TITLE
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
})

onUnmounted(() => {
  abortController.abort()
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

.hero-heading {
  position: absolute;
  top: var(--space-s);
  left: var(--space-s);
  z-index: 2;
  max-width: 62vw;
}

.hero-home-link {
  display: block;
  width: fit-content;
  color: inherit;
  text-decoration: none;
}

.hero-title {
  display: grid;
  margin: 0;
  color: #fff;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: -.025em;
  line-height: .96;
  mix-blend-mode: difference;
}

.hero-title span {
  white-space: nowrap;
}

.hero-nav {
  position: absolute;
  top: var(--space-s);
  left: 67.7vw;
  z-index: 2;
  display: grid;
  line-height: .96;
}

.hero-nav a {
  width: fit-content;
  color: inherit;
  text-decoration: none;
  transition: opacity .25s ease;
}

.scene-explorer {
  display: grid;
  grid-template-columns: minmax(0, 40.5vw) minmax(220px, 24vw);
  gap: 2.1vw;
  align-items: start;
  min-height: 100vh;
  padding-top: 20.5vh;
  padding-left: 9.5vw;
}

.visual-column {
  min-width: 0;
}

.scene-frame {
  position: relative;
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
  display: flex;
  flex-wrap: wrap;
  gap: clamp(15px, 1.7vw, 68px);
  align-items: baseline;
  padding-top: clamp(16px, 2.4vh, 52px);
}

.temperature-filter {
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 5.2vh, 112px);
  margin-top: 11.7vh;
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

.copy {
  position: fixed;
  right: var(--space-s);
  bottom: var(--space-s);
  z-index: 2;
  line-height: .9;
  white-space: nowrap;
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
  .hero-nav a:hover {
    opacity: .56;
  }
}

@media (max-width: 1024px) and (min-width: 760px) {
  .scene-explorer {
    grid-template-columns: minmax(0, 54vw) minmax(180px, 28vw);
    padding-left: 4vw;
  }

  .hero-nav {
    left: 64vw;
  }
}

@media (max-width: 759px) {
  .hero-wrapper {
    min-height: 100svh;
    overflow: visible;
  }

  .hero-heading,
  .hero-nav {
    position: relative;
    top: auto;
    left: auto;
  }

  .hero-heading {
    max-width: calc(100% - 64px);
    padding: var(--space-s) 0 0 var(--space-s);
  }

  .hero-title {
    font-size: clamp(18px, 5.4vw, 32px);
    line-height: 1;
  }

  .hero-nav {
    grid-template-columns: repeat(2, max-content);
    gap: 4px clamp(20px, 8vw, 44px);
    margin-top: clamp(34px, 9vh, 72px);
    padding-left: var(--space-s);
    font-size: clamp(17px, 5vw, 24px);
    line-height: 1.05;
  }

  .scene-explorer {
    grid-template-columns: 1fr;
    gap: clamp(34px, 9vw, 64px);
    min-height: auto;
    padding: clamp(52px, 11vh, 92px) var(--space-s) 116px;
  }

  .scene-frame {
    aspect-ratio: 1.22 / 1;
  }

  .fixture-filter {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 14px;
    padding-top: 20px;
  }

  .temperature-filter {
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

  .copy {
    font-size: clamp(18px, 5.4vw, 30px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-fade-enter-active,
  .scene-fade-leave-active,
  .hero-nav a,
  .filter-button {
    transition: none;
  }
}
</style>
