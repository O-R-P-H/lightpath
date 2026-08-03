<template>
  <div class="services-page-wrapper">
    <Header />

    <section id="services" class="services-section">
      <div class="services-grid-header">
        <BrandLink class="services-main-title" />
        <div class="services-sec-title">Услуги</div>
      </div>

      <div v-if="!loading && !error" class="services-content">
        <div class="services-intro-grid">
          <div class="services-kicker">Световой дизайн<br>от идеи до реализации</div>
          <div class="services-intro" v-html="sanitizedIntro"></div>

          <figure v-if="photoUrl" class="services-visual">
            <img :src="photoUrl" alt="Световой дизайн" />
          </figure>
        </div>

        <ol v-if="serviceItems.length" class="services-list">
          <li v-for="(service, index) in serviceItems" :key="`${service.title}-${index}`" class="service-item">
            <article class="service-card">
              <span class="service-number">{{ String(index + 1).padStart(2, '0') }}</span>

              <div class="service-copy">
                <h2>{{ service.title }}</h2>
                <p v-if="service.description">{{ service.description }}</p>
                <p v-if="service.includes" class="service-includes">
                  <span>В составе</span>{{ service.includes }}
                </p>
              </div>

              <div class="service-meta">
                <span v-if="service.duration">Срок — {{ service.duration }}</span>
                <strong v-if="service.price">{{ service.price }}</strong>
              </div>
            </article>
          </li>
        </ol>

        <div v-else class="services-empty">Список услуг скоро появится.</div>

        <router-link class="services-cta" to="/contacts">
          <span>Обсудить проект</span>
          <span aria-hidden="true">↗</span>
        </router-link>
      </div>

      <div v-else-if="error" class="services-loading">
        <span class="loading-text">Не удалось загрузить услуги. Попробуйте обновить страницу.</span>
      </div>

      <div v-else class="services-loading">
        <span class="loading-text">Загрузка услуг...</span>
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

const resolvePhotoUrl = (photo) => {
  if (!photo) return ''
  if (typeof photo === 'object') return assetUrl(photo)

  const path = cleanText(photo)
  if (/^https?:\/\//i.test(path)) return path
  if (path.includes('assets/')) return `${DIRECTUS_URL}/${path.replace(/^\//, '')}`
  return assetUrl(path, { width: 1600, quality: 84 })
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
  padding: var(--space-s);
  border-top: 1px solid var(--color-line);
  box-sizing: border-box;
}

.services-grid-header {
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: var(--space-m);
  padding-bottom: var(--space-l);
}

.services-main-title,
.services-sec-title {
  margin: 0;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.04em;
}

.services-content {
  padding-top: var(--space-m);
}

.services-intro-grid {
  display: grid;
  grid-template-columns: minmax(180px, 0.72fr) minmax(0, 1.34fr) minmax(220px, 0.94fr);
  gap: var(--space-m);
  align-items: start;
  min-height: 42vh;
  padding-bottom: var(--space-l);
}

.services-kicker {
  max-width: 16rem;
  font-size: clamp(14px, 0.44rem, 20px);
  font-weight: 300;
  line-height: 1.35;
  opacity: 0.62;
}

.services-intro {
  max-width: 22ch;
  font-size: clamp(28px, 0.88rem, 56px);
  font-weight: 300;
  line-height: 1.06;
  letter-spacing: -0.035em;
}

.services-intro :deep(p) {
  margin: 0;
}

.services-visual {
  align-self: stretch;
  min-height: 34vh;
  margin: 0;
  overflow: hidden;
  border-radius: 2px;
}

.services-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.65) contrast(1.06);
}

.services-list {
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--color-line);
  list-style: none;
}

.service-item {
  border-bottom: 1px solid var(--color-line);
}

.service-card {
  display: grid;
  grid-template-columns: minmax(48px, 0.72fr) minmax(0, 2.06fr) minmax(180px, 0.94fr);
  gap: var(--space-m);
  align-items: start;
  padding: var(--space-m) 0 var(--space-l);
  transition: background-color 180ms ease, padding 180ms ease;
}

.service-number,
.service-meta,
.service-includes span {
  font-size: clamp(13px, 0.36rem, 17px);
  font-weight: 300;
  line-height: 1.35;
  opacity: 0.58;
}

.service-copy h2 {
  max-width: 18ch;
  margin: 0;
  font-size: clamp(32px, 1rem, 62px);
  font-weight: 300;
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.service-copy > p {
  max-width: 54ch;
  margin: var(--space-s) 0 0;
  font-size: clamp(16px, 0.45rem, 23px);
  font-weight: 300;
  line-height: 1.4;
  letter-spacing: -0.01em;
  opacity: 0.78;
}

.service-copy .service-includes {
  display: grid;
  grid-template-columns: minmax(80px, 0.3fr) 1fr;
  gap: var(--space-s);
  margin-top: var(--space-m);
  padding-top: var(--space-s);
  border-top: 1px solid var(--color-line);
  font-size: clamp(14px, 0.38rem, 19px);
}

.service-meta {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-s);
  text-align: right;
}

.service-meta strong {
  color: var(--color-front);
  font-size: clamp(19px, 0.58rem, 30px);
  font-weight: 300;
  opacity: 1;
}

.services-empty {
  padding: var(--space-l) 0;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
  font-size: clamp(20px, 0.7rem, 36px);
  font-weight: 300;
  opacity: 0.58;
}

.services-cta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-m);
  padding: var(--space-l) 0;
  color: inherit;
  font-size: clamp(30px, 1.15rem, 72px);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.04em;
  text-decoration: none;
}

.services-loading {
  display: grid;
  min-height: 75vh;
  place-items: center;
}

.loading-text {
  max-width: 34rem;
  font-size: clamp(18px, 0.48rem, 24px);
  font-weight: 300;
  line-height: 1.35;
  text-align: center;
  opacity: 0.5;
}

@media (hover: hover) {
  .service-item:hover .service-card {
    padding-right: var(--space-s);
    padding-left: var(--space-s);
    background: rgba(241, 241, 240, 0.035);
  }

  .services-cta:hover span:first-child {
    transform: translateX(var(--space-s));
  }

  .services-cta span:first-child {
    transition: transform 180ms ease;
  }
}

@media (max-width: 900px) {
  .services-grid-header {
    grid-template-columns: 1fr;
    gap: var(--space-s);
  }

  .services-main-title,
  .services-sec-title {
    font-size: 1.15rem;
  }

  .services-intro-grid {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .services-intro {
    max-width: 24ch;
  }

  .services-visual {
    min-height: 44vh;
  }

  .service-card {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .service-meta {
    grid-column: 2;
    min-height: 0;
    flex-direction: row;
    align-items: baseline;
    text-align: left;
  }
}

@media (max-width: 560px) {
  .services-grid-header {
    padding-right: 2.4rem;
  }

  .services-intro-grid {
    padding-top: var(--space-l);
  }

  .services-kicker {
    font-size: 14px;
  }

  .services-visual {
    min-height: 36vh;
  }

  .service-card {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .service-copy h2 {
    font-size: clamp(28px, 9vw, 42px);
  }

  .service-copy .service-includes {
    grid-template-columns: 1fr;
  }

  .service-meta {
    flex-direction: column;
    align-items: flex-start;
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
  font-size: 7.5vw !important;
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
