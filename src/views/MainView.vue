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

      <nav ref="serviceListRef" class="hero-list" aria-label="Услуги">
        <router-link
          v-for="(service, index) in serviceItems"
          :key="`${service.title}-${index}`"
          :to="{ path: '/gallery', hash: `#service-${String(index + 1).padStart(2, '0')}` }"
        >
          {{ service.navigationTitle }}
        </router-link>
      </nav>
    </header>

    <main class="scene-explorer" aria-label="Подбор светового решения">
      <nav class="fixture-filter" aria-label="Зона освещения">
        <p class="filter-heading">Локация</p>
        <div class="filter-options">
          <button
            v-for="option in fixtureOptions"
            :key="option"
            class="filter-button"
            :class="{ active: selectedFixtures.includes(option) }"
            type="button"
            :aria-pressed="selectedFixtures.includes(option)"
            @pointerenter="preloadFixture(option)"
            @click="toggleFixture(option)"
          >
            {{ option }}
          </button>
        </div>
      </nav>

      <aside class="temperature-filter" aria-label="Сценарий света">
        <p class="filter-heading">Температура света</p>
        <div class="filter-options">
          <button
            v-for="option in temperatureOptions"
            :key="option"
            class="filter-button"
            :class="{ active: option === selectedTemperature }"
            type="button"
            :aria-pressed="option === selectedTemperature"
            @pointerenter="preloadTemperature(option)"
            @click="selectTemperature(option)"
          >
            {{ option }}
          </button>
        </div>
      </aside>

      <div class="scene-frame" :style="{ backgroundColor: placeholderColor }">
        <Transition name="scene-fade">
          <img
            v-if="displayedImageUrl"
            :key="displayedImageUrl"
            class="scene-image"
            :src="displayedImageUrl"
            :alt="`${currentSceneLabel} — ${selectedTemperature}`"
          />
          <div v-else key="placeholder" class="solid-placeholder" aria-hidden="true"></div>
        </Transition>
        <span class="visually-hidden" aria-live="polite">
          {{ currentImageUrl ? `${currentSceneLabel}, ${selectedTemperature}` : 'Изображение для выбранной комбинации пока не добавлено' }}
        </span>
      </div>
    </main>

    <router-link class="link m-vertical more" to="/about">
      <span>Подробнее</span>
    </router-link>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Header from '../components/Header.vue'
import { DIRECTUS_URL, assetUrl, preloadImage } from '../utils/directus.js'
import { scrambleElementText } from '../utils/textScramble.js'

const DEFAULT_TITLE = 'Студия светового дизайна\nМацнева Николая'
const DEFAULT_FIXTURES = ['Болларды', 'Ступени', 'Забор', 'Деревья/кусты', 'Фасадные', 'Линейные']
const DEFAULT_TEMPERATURES = ['Дневной белый', 'Нейтральный белый', 'Теплый белый', 'Янтарный']
const DEFAULT_PLACEHOLDER_COLOR = '#171821'
const GLYPHS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789_*?@#$%+=-'

const [targetTitleLine1, targetTitleLine2] = DEFAULT_TITLE.split('\n')
const titleLine1 = ref('')
const titleLine2 = ref('')
const fixtureOptions = ref(DEFAULT_FIXTURES)
const temperatureOptions = ref(DEFAULT_TEMPERATURES)
const placeholderColor = ref(DEFAULT_PLACEHOLDER_COLOR)
const sceneImages = ref([])
const displayedImageUrl = ref('')
const serviceItems = ref([])
const serviceListRef = ref(null)
const selectedFixtures = ref([])
const selectedTemperature = ref(DEFAULT_TEMPERATURES[0])
const abortController = new AbortController()
const scrambleTimeouts = []
const scrambleIntervals = []
const animationCleanups = []
let imageLoadRequest = 0

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

const fixtureGroupKey = (value) => {
  const fixtures = new Set((Array.isArray(value) ? value : String(value || '').split(/\s*\+\s*/))
    .map((fixture) => fixture.trim())
    .filter((fixture) => fixture && fixture !== 'Свет выключен'))

  return fixtureOptions.value.filter((fixture) => fixtures.has(fixture)).join('|')
}

const selectedFixtureKey = computed(() => fixtureGroupKey(selectedFixtures.value.join(' + ')))
const currentSceneLabel = computed(() => (
  selectedFixtures.value.length ? selectedFixtures.value.join(', ') : 'Свет выключен'
))

const currentImage = computed(() => (
  sceneImages.value.find((item) => (
    fixtureGroupKey(item.fixtureFilters) === selectedFixtureKey.value
    && item.temperatureFilter === selectedTemperature.value
    && item.image
  )) || null
))

const imageAssetUrl = (image) => assetUrl(image, {
  width: 1720,
  height: 960,
  fit: 'cover',
  quality: 85,
  format: 'webp',
})

const currentImageUrl = computed(() => imageAssetUrl(currentImage.value?.image))

const displayImageWhenReady = async (url) => {
  const requestId = ++imageLoadRequest
  if (!url) {
    displayedImageUrl.value = ''
    return
  }

  try {
    const loadedUrl = await preloadImage(url, assetUrl(currentImage.value?.image))
    if (requestId !== imageLoadRequest) return
    displayedImageUrl.value = loadedUrl
  } catch (error) {
    if (requestId === imageLoadRequest) console.error('Не удалось загрузить изображение главной:', error)
  }
}

watch(currentImageUrl, displayImageWhenReady)

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

const toggleFixture = (fixture) => {
  const selected = new Set(selectedFixtures.value)
  if (selected.has(fixture)) selected.delete(fixture)
  else selected.add(fixture)
  selectedFixtures.value = fixtureOptions.value.filter((option) => selected.has(option))
}

const selectTemperature = (temperature) => {
  selectedTemperature.value = temperature
}

const findScene = (fixtures, temperature) => {
  const targetKey = fixtureGroupKey(fixtures.join(' + '))
  return sceneImages.value.find((item) => (
    fixtureGroupKey(item.fixtureFilters) === targetKey
    && item.temperatureFilter === temperature
    && item.image
  ))
}

const preloadScene = (fixtures, temperature) => {
  const scene = findScene(fixtures, temperature)
  if (!scene?.image) return
  preloadImage(imageAssetUrl(scene.image), assetUrl(scene.image)).catch(() => {})
}

const preloadFixture = (fixture) => {
  const nextFixtures = selectedFixtures.value.includes(fixture)
    ? selectedFixtures.value.filter((item) => item !== fixture)
    : fixtureOptions.value.filter((item) => item === fixture || selectedFixtures.value.includes(item))
  preloadScene(nextFixtures, selectedTemperature.value)
}

const preloadTemperature = (temperature) => {
  preloadScene(selectedFixtures.value, temperature)
}

const loadHomepage = async () => {
  const query = new URLSearchParams({
    fields: 'fixture_filters,temperature_filters,placeholder_color,scene_items.id,scene_items.sort,scene_items.image.id,scene_items.fixture_filters,scene_items.temperature_filter',
    'deep[scene_items][_sort]': 'sort',
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
    selectedFixtures.value = []
    selectedTemperature.value = temperatureOptions.value[0]
    sceneImages.value = Array.isArray(data.scene_items)
      ? data.scene_items
        .map((item, index) => ({
          id: item?.id || `${index}-${item?.image?.id || item?.image || ''}`,
          image: item?.image || '',
          fixtureFilters: Array.isArray(item?.fixture_filters) ? item.fixture_filters : [],
          temperatureFilter: String(item?.temperature_filter || '').trim(),
        }))
        .filter((item) => item.image && item.temperatureFilter)
      : []

    await displayImageWhenReady(currentImageUrl.value)
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Не удалось загрузить главную страницу из Directus:', error)
    }
  }
}

const loadServices = async () => {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/services?fields=service_items`, {
      cache: 'no-store',
      signal: abortController.signal,
    })
    if (!response.ok) throw new Error(`Directus responded with ${response.status}`)

    const { data } = await response.json()
    serviceItems.value = Array.isArray(data?.service_items)
      ? data.service_items
        .map((service) => {
          const title = String(service?.title || '').trim()
          return { title, navigationTitle: title === 'Аудит световой среды' ? 'Аудит' : title }
        })
        .filter((service) => service.title)
      : []

    await nextTick()
    const serviceLinks = serviceListRef.value?.querySelectorAll('a') || []
    serviceLinks.forEach((element, index) => {
      animationCleanups.push(scrambleElementText(element, {
        delay: 620 + index * 105,
        duration: 720,
        frameDuration: 45,
      }))
    })
  } catch (error) {
    if (error.name !== 'AbortError') console.error('Не удалось загрузить список услуг из Directus:', error)
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  loadHomepage()
  loadServices()
  runScramble(targetTitleLine1, titleLine1, 150)
  runScramble(targetTitleLine2, titleLine2, 450)
})

onUnmounted(() => {
  abortController.abort()
  scrambleTimeouts.forEach((timeout) => window.clearTimeout(timeout))
  scrambleIntervals.forEach((interval) => window.clearInterval(interval))
  animationCleanups.forEach((cleanup) => cleanup())
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
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: -.02em;
  word-spacing: .12em;
  line-height: 1;
  mix-blend-mode: difference;
  pointer-events: auto;
}

.scramble-line {
  white-space: nowrap;
}

.hero-list {
  display: grid;
  align-content: start;
  padding-top: 1.08rem;
}

.hero-list a {
  width: fit-content;
  max-width: 100%;
  color: inherit;
  font-size: clamp(18px, 1.8vw, 58px);
  line-height: 1.02;
  text-decoration: none;
  overflow-wrap: anywhere;
  transition: opacity .25s ease;
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
  aspect-ratio: 43 / 24;
  overflow: hidden;
}

.scene-image,
.solid-placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.scene-image {
  position: absolute;
  inset: 0;
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

.filter-heading {
  display: none;
}

.filter-options {
  display: contents;
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

.scene-fade-leave-active {
  position: absolute;
}

.scene-fade-enter-from,
.scene-fade-leave-to {
  opacity: 0;
}

@media (hover: hover) {
  .hero-list a:hover {
    opacity: .56;
  }

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
    display: flex;
    flex-direction: column;
    min-height: 100svh;
    overflow: visible;
  }

  .hero-header {
    position: relative;
    top: auto;
    right: auto;
    left: auto;
    flex: 0 0 auto;
    grid-template-columns: 1fr;
    padding: var(--space-s) calc(var(--space-s) + 54px) 0 var(--space-s);
  }

  .hero-title {
    font-size: clamp(18px, 5.4vw, 32px);
    line-height: 1;
  }

  .hero-list {
    display: grid;
    gap: 5px;
    margin-top: clamp(26px, 5vh, 44px);
    padding-top: 0;
    font-size: initial;
  }

  .hero-list a {
    font-size: clamp(17px, 5vw, 24px);
    line-height: 1.03;
  }

  .scene-explorer {
    flex: 1 1 auto;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    gap: clamp(14px, 2.2vh, 20px);
    align-content: center;
    min-height: 0;
    padding: clamp(28px, 6vh, 56px) max(20px, env(safe-area-inset-right)) clamp(28px, 6vh, 56px) max(20px, env(safe-area-inset-left));
  }

  .scene-frame {
    grid-column: 1;
    grid-row: 2;
    width: 100%;
    min-width: 0;
    margin: 0;
    aspect-ratio: 43 / 24;
  }

  .fixture-filter {
    grid-column: 1;
    grid-row: 1;
    align-self: stretch;
    display: block;
    width: 100%;
    min-width: 0;
    padding: 0;
  }

  .temperature-filter {
    grid-column: 1;
    grid-row: 3;
    align-self: stretch;
    display: block;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
  }

  .filter-heading {
    display: block;
    margin: 0 2px 8px;
    color: rgba(241, 241, 240, .46);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: .1em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .filter-options {
    display: flex;
    gap: 4px;
    width: 100%;
    min-width: 0;
    padding: 4px;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, .13);
    border-radius: 999px;
    box-sizing: border-box;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .035));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .12),
      inset 0 -1px 0 rgba(0, 0, 0, .18),
      0 8px 24px rgba(0, 0, 0, .14);
    backdrop-filter: blur(18px) saturate(145%);
    scroll-padding-inline: 4px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    overscroll-behavior-inline: contain;
    -webkit-backdrop-filter: blur(18px) saturate(145%);
    -webkit-overflow-scrolling: touch;
  }

  .filter-options::-webkit-scrollbar {
    display: none;
  }

  .filter-button {
    flex: 0 0 auto;
    min-width: max-content;
    min-height: 42px;
    padding: 10px 14px;
    border: 1px solid transparent;
    border-radius: 999px;
    color: rgba(241, 241, 240, .62);
    background: transparent;
    font-size: clamp(13px, 3.5vw, 15px);
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    scroll-snap-align: center;
    transition:
      color .25s ease,
      background-color .25s ease,
      border-color .25s ease,
      box-shadow .25s ease;
  }

  .filter-button.active {
    border-color: rgba(255, 255, 255, .24);
    color: #fff;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, .2), rgba(255, 255, 255, .09));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .28),
      0 3px 12px rgba(0, 0, 0, .2);
  }

  .filter-button:focus-visible {
    outline: 2px solid var(--color-front);
    outline-offset: 2px;
  }

  .m-vertical {
    display: inline-block;
    text-align: right;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  .more {
    position: absolute;
    display: none;
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
