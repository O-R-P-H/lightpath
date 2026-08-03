<template>
  <div class="services-page-wrapper">
    <Header />

    <section id="services" class="services-section">
      <div class="services-shell">
        <div class="services-grid-header">
          <BrandLink class="services-main-title" />
          <div class="services-sec-title">Услуги</div>
        </div>

        <div v-if="!loading && !error" class="services-content">
          <header class="services-hero" :class="{ 'services-hero--with-visual': photoUrl }">
            <div class="services-hero-aside">
              <span class="services-eyebrow">Полный цикл</span>
              <p>Концепция<br>Расчёт<br>Реализация</p>
            </div>

            <div class="services-hero-copy">
              <h1>Световой дизайн для архитектуры и ландшафта</h1>
              <div class="services-intro" v-html="sanitizedIntro"></div>
            </div>

            <figure v-if="photoUrl" class="services-visual">
              <img :src="photoUrl" alt="Световой дизайн" />
            </figure>
          </header>

          <div class="services-list-heading">
            <span>Направления работы</span>
            <span>{{ serviceItems.length }} {{ serviceCountLabel }}</span>
          </div>

          <ol v-if="serviceItems.length" class="services-list">
            <li v-for="(service, index) in serviceItems" :key="`${service.title}-${index}`" class="service-item">
              <article class="service-card">
                <header class="service-card-header">
                  <span class="service-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span v-if="service.duration" class="service-duration">до результата · {{ service.duration }}</span>
                </header>

                <div class="service-copy">
                  <h2>{{ service.title }}</h2>
                  <p v-if="service.description" class="service-description">{{ service.description }}</p>
                </div>

                <div v-if="service.includes" class="service-includes">
                  <span class="service-includes-label">Что входит</span>
                  <p>{{ service.includes }}</p>
                </div>

                <footer class="service-footer">
                  <span>Стоимость проекта</span>
                  <strong v-if="service.price">{{ service.price }}</strong>
                  <strong v-else>По запросу</strong>
                </footer>
              </article>
            </li>
          </ol>

          <div v-else class="services-empty">Список услуг скоро появится.</div>

          <router-link class="services-cta" to="/contacts">
            <span class="services-cta-kicker">Есть задача?</span>
            <span class="services-cta-title">Обсудить проект</span>
            <span class="services-cta-arrow" aria-hidden="true">↗</span>
          </router-link>
        </div>

        <div v-else-if="error" class="services-loading">
          <span class="loading-text">Не удалось загрузить услуги. Попробуйте обновить страницу.</span>
        </div>

        <div v-else class="services-loading">
          <span class="loading-text">Загрузка услуг...</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Header from '../components/Header.vue'
import BrandLink from '../components/BrandLink.vue'
import { sanitizeHtml } from '../utils/sanitize'
import { DIRECTUS_URL, assetUrl } from '../utils/directus'

const intro = ref('')
const rawServiceItems = ref([])
const photoUrl = ref('')
const loading = ref(true)
const error = ref(false)

const sanitizedIntro = computed(() => sanitizeHtml(intro.value))

const cleanText = (value) => typeof value === 'string' ? value.trim() : ''

const serviceItems = computed(() => {
  if (!Array.isArray(rawServiceItems.value)) return []

  return rawServiceItems.value
    .map((item) => ({
      title: cleanText(item?.title),
      description: cleanText(item?.description),
      includes: cleanText(item?.includes),
      duration: cleanText(item?.duration),
      price: cleanText(item?.price),
    }))
    .filter((item) => item.title)
})

const serviceCountLabel = computed(() => {
  const count = serviceItems.value.length
  const remainder = count % 10
  const remainder100 = count % 100
  if (remainder === 1 && remainder100 !== 11) return 'услуга'
  if (remainder >= 2 && remainder <= 4 && (remainder100 < 12 || remainder100 > 14)) return 'услуги'
  return 'услуг'
})

const resolvePhotoUrl = (photo) => {
  if (!photo) return ''
  if (typeof photo === 'object') return assetUrl(photo)

  const path = cleanText(photo)
  if (/^https?:\/\//i.test(path)) return path
  if (path.includes('assets/')) return `${DIRECTUS_URL}/${path.replace(/^\//, '')}`
  return assetUrl(path, { width: 1800, quality: 84 })
}

const fetchServicesData = async () => {
  try {
    const fields = 'title,photo_services,service_items'
    const response = await fetch(`${DIRECTUS_URL}/items/services?fields=${fields}`)
    if (!response.ok) throw new Error(`CMS returned ${response.status}`)

    const { data } = await response.json()
    intro.value = data?.title || ''
    rawServiceItems.value = data?.service_items || []
    photoUrl.value = resolvePhotoUrl(data?.photo_services)
  } catch (err) {
    console.error('Ошибка при загрузке данных об услугах из Directus:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  fetchServicesData()
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
.services-page-wrapper {
  min-height: 100vh;
  overflow-x: hidden;
  color: var(--color-front, #f1f1f0);
  font-family: 'Inter', sans-serif;
}

.services-section {
  min-height: 100vh;
  padding: clamp(8px, 0.6vw, 24px);
  border-top: 1px solid var(--color-line);
  box-sizing: border-box;
}

.services-shell {
  width: min(100%, 2400px);
  margin: 0 auto;
}

.services-grid-header {
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: clamp(20px, 2vw, 72px);
  padding-bottom: clamp(48px, 7vw, 220px);
}

.services-main-title,
.services-sec-title {
  margin: 0;
  color: #fff;
  font-size: clamp(18px, 1.15vw, 38px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.035em;
}

.services-hero {
  display: grid;
  grid-template-columns: minmax(150px, 0.62fr) minmax(0, 2.38fr);
  gap: clamp(28px, 4vw, 120px);
  padding: clamp(34px, 4vw, 110px) 0 clamp(56px, 7vw, 190px);
  border-top: 1px solid var(--color-line);
  align-items: start;
}

.services-hero--with-visual {
  grid-template-columns: minmax(150px, 0.55fr) minmax(0, 1.35fr) minmax(300px, 1.1fr);
}

.services-hero-aside {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  justify-content: space-between;
  gap: clamp(28px, 5vw, 110px);
  color: rgba(241, 241, 240, 0.62);
  font-size: clamp(14px, 0.62vw, 24px);
  line-height: 1.42;
  letter-spacing: -0.01em;
}

.services-hero-aside p {
  margin: 0;
}

.services-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.services-eyebrow::before {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  content: '';
}

.services-hero-copy h1 {
  max-width: 12ch;
  margin: 0;
  font-size: clamp(48px, 6.3vw, 172px);
  font-weight: 300;
  line-height: 0.9;
  letter-spacing: -0.06em;
  text-wrap: balance;
}

.services-intro {
  max-width: 42ch;
  margin-top: clamp(32px, 4vw, 100px);
  color: rgba(241, 241, 240, 0.72);
  font-size: clamp(18px, 1.25vw, 40px);
  font-weight: 300;
  line-height: 1.35;
  letter-spacing: -0.018em;
  word-spacing: 0.08em;
}

.services-intro :deep(p) {
  margin: 0;
}

.services-visual {
  min-height: clamp(420px, 42vw, 920px);
  margin: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}

.services-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.62) contrast(1.08);
}

.services-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(22px, 2vw, 54px) 0;
  border-top: 1px solid var(--color-line);
  color: rgba(241, 241, 240, 0.6);
  font-size: clamp(16px, 0.72vw, 26px);
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.services-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(12px, 1vw, 32px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.service-item {
  display: flex;
  min-width: 0;
}

.service-card {
  display: flex;
  width: 100%;
  min-height: clamp(520px, 38vw, 820px);
  padding: clamp(24px, 2.4vw, 70px);
  border: 1px solid var(--color-line);
  background:
    radial-gradient(circle at 100% 0%, rgba(112, 107, 205, 0.12), transparent 42%),
    rgba(7, 8, 18, 0.3);
  box-sizing: border-box;
  flex-direction: column;
  transition: border-color 220ms ease, background-color 220ms ease, transform 220ms ease;
}

.service-card-header,
.service-footer {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
}

.service-number,
.service-duration,
.service-includes-label,
.service-footer > span {
  color: rgba(241, 241, 240, 0.55);
  font-size: clamp(14px, 0.66vw, 24px);
  font-weight: 300;
  line-height: 1.25;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.service-duration {
  text-align: right;
}

.service-copy {
  padding: clamp(60px, 7vw, 170px) 0 clamp(42px, 5vw, 120px);
}

.service-copy h2 {
  max-width: 15ch;
  margin: 0;
  font-size: clamp(38px, 3.4vw, 88px);
  font-weight: 300;
  line-height: 0.98;
  letter-spacing: -0.05em;
  text-wrap: balance;
}

.service-description {
  max-width: 46ch;
  margin: clamp(28px, 3vw, 72px) 0 0;
  color: rgba(241, 241, 240, 0.74);
  font-size: clamp(18px, 1vw, 32px);
  font-weight: 300;
  line-height: 1.42;
  letter-spacing: 0;
  word-spacing: 0.06em;
}

.service-includes {
  display: grid;
  grid-template-columns: minmax(90px, 0.36fr) minmax(0, 1fr);
  gap: clamp(18px, 2vw, 54px);
  margin-top: auto;
  padding: clamp(24px, 2.2vw, 60px) 0;
  border-top: 1px solid var(--color-line);
}

.service-includes p {
  margin: 0;
  color: rgba(241, 241, 240, 0.82);
  font-size: clamp(17px, 0.82vw, 28px);
  font-weight: 300;
  line-height: 1.48;
  letter-spacing: 0;
  word-spacing: 0.08em;
}

.service-footer {
  padding-top: clamp(22px, 2vw, 52px);
  border-top: 1px solid var(--color-line);
}

.service-footer strong {
  font-size: clamp(24px, 1.75vw, 52px);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.035em;
  text-align: right;
}

.services-empty {
  padding: clamp(48px, 6vw, 160px) 0;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
  font-size: clamp(24px, 2vw, 52px);
  font-weight: 300;
  opacity: 0.58;
}

.services-cta {
  display: grid;
  grid-template-columns: minmax(120px, 0.62fr) minmax(0, 2.15fr) auto;
  gap: clamp(24px, 4vw, 110px);
  align-items: end;
  margin-top: clamp(80px, 10vw, 280px);
  padding: clamp(30px, 4vw, 100px) 0 clamp(50px, 6vw, 150px);
  border-top: 1px solid var(--color-line);
  color: inherit;
  text-decoration: none;
}

.services-cta-kicker {
  align-self: start;
  color: rgba(241, 241, 240, 0.58);
  font-size: clamp(14px, 0.72vw, 26px);
}

.services-cta-title,
.services-cta-arrow {
  font-size: clamp(46px, 6.2vw, 168px);
  font-weight: 300;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.services-loading {
  display: grid;
  min-height: 75vh;
  place-items: center;
}

.loading-text {
  max-width: 40ch;
  font-size: clamp(18px, 1vw, 32px);
  font-weight: 300;
  line-height: 1.35;
  text-align: center;
  opacity: 0.5;
}

@media (hover: hover) {
  .service-card:hover {
    border-color: rgba(241, 241, 240, 0.38);
    background-color: rgba(241, 241, 240, 0.025);
    transform: translateY(-4px);
  }

  .services-cta:hover .services-cta-arrow {
    transform: translate(8px, -8px);
  }

  .services-cta-arrow {
    transition: transform 220ms ease;
  }
}

@media (max-width: 999px) {
  .services-grid-header {
    grid-template-columns: 1fr;
    gap: 8px;
    padding-right: 56px;
  }

  .services-hero,
  .services-hero--with-visual {
    grid-template-columns: 1fr;
  }

  .services-hero-aside {
    min-height: 0;
    flex-direction: row;
  }

  .services-hero-aside p {
    display: none;
  }

  .services-hero-copy h1 {
    max-width: 13ch;
  }

  .services-visual {
    min-height: min(72vw, 620px);
  }

  .services-list {
    grid-template-columns: 1fr;
  }

  .service-card {
    min-height: 0;
  }

  .services-cta {
    grid-template-columns: 1fr auto;
  }

  .services-cta-kicker {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .services-grid-header {
    padding-bottom: 74px;
  }

  .services-main-title,
  .services-sec-title {
    font-size: clamp(20px, 5.5vw, 24px);
  }

  .services-hero {
    gap: 28px;
    padding-bottom: 84px;
  }

  .services-hero-copy h1 {
    font-size: clamp(42px, 12vw, 56px);
  }

  .services-intro {
    margin-top: 30px;
    font-size: 18px;
  }

  .services-list-heading {
    padding: 20px 0;
  }

  .service-card {
    padding: 22px 18px;
  }

  .service-copy {
    padding: 58px 0 44px;
  }

  .service-copy h2 {
    font-size: clamp(34px, 10.5vw, 46px);
  }

  .service-includes {
    grid-template-columns: 1fr;
    padding: 24px 0;
  }

  .service-footer {
    align-items: flex-end;
  }

  .services-cta {
    gap: 26px 14px;
    margin-top: 90px;
  }

  .services-cta-title,
  .services-cta-arrow {
    font-size: clamp(40px, 11vw, 52px);
  }
}
</style>

<style>
html.reference-root-active {
  margin: 0;
  padding: 0;
  background-color: #090a16;
  scroll-behavior: smooth;
  font-family: 'Inter', sans-serif !important;
  font-size: clamp(28px, 7.5vw, 58px) !important;
  line-height: 1 !important;
  letter-spacing: -0.04em;
  --space-s: 0.2rem;
  --space-m: 0.66rem;
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
