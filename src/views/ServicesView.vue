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
          <ol v-if="serviceItems.length" class="services-list">
            <li
              v-for="(service, index) in serviceItems"
              :id="`service-${String(index + 1).padStart(2, '0')}`"
              :key="`${service.title}-${index}`"
              class="service-item"
            >
              <article
                class="service-card"
                :class="{ 'service-card--compact': !service.description && !service.includes && !service.duration }"
              >
                <header class="service-card-header">
                  <span class="service-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span v-if="service.duration" class="service-duration">
                    Срок предоставления услуги · {{ service.duration }}
                  </span>
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
                  <span>Стоимость</span>
                  <p>{{ service.price || 'По запросу' }}</p>
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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Header from '../components/Header.vue'
import BrandLink from '../components/BrandLink.vue'
import { DIRECTUS_URL } from '../utils/directus'

const rawServiceItems = ref([])
const loading = ref(true)
const error = ref(false)
const route = useRoute()

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

const fetchServicesData = async () => {
  try {
    const fields = 'service_items'
    const response = await fetch(`${DIRECTUS_URL}/items/services?fields=${fields}`)
    if (!response.ok) throw new Error(`CMS returned ${response.status}`)

    const { data } = await response.json()
    rawServiceItems.value = data?.service_items || []
    await nextTick()

    if (route.hash) {
      document.querySelector(route.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
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
  padding:
    max(clamp(8px, 0.6vw, 24px), env(safe-area-inset-top))
    max(clamp(8px, 0.6vw, 24px), env(safe-area-inset-right))
    max(clamp(8px, 0.6vw, 24px), env(safe-area-inset-bottom))
    max(clamp(8px, 0.6vw, 24px), env(safe-area-inset-left));
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
  padding: 0 max(70px, calc(env(safe-area-inset-right) + 56px)) clamp(48px, 7vw, 220px) 0;
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
  scroll-margin-top: clamp(12px, 2vw, 48px);
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

.service-card-header {
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

.service-card--compact {
  min-height: clamp(360px, 24vw, 560px);
}

.service-card--compact .service-copy {
  margin: auto 0;
  padding: clamp(44px, 5vw, 120px) 0;
}

.service-copy h2 {
  max-width: 15ch;
  margin: 0;
  font-size: clamp(38px, 3.4vw, 88px);
  font-weight: 300;
  line-height: 0.98;
  letter-spacing: -0.05em;
  text-wrap: balance;
  overflow-wrap: anywhere;
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
  white-space: pre-line;
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
  white-space: pre-line;
}

.service-footer {
  display: grid;
  grid-template-columns: minmax(90px, 0.36fr) minmax(0, 1fr);
  gap: clamp(18px, 2vw, 54px);
  padding: clamp(24px, 2.2vw, 60px) 0 0;
  border-top: 1px solid var(--color-line);
}

.service-includes + .service-footer {
  margin-top: 0;
}

.service-footer p {
  margin: 0;
  color: #f1f1f0;
  font-size: clamp(21px, 1.2vw, 38px);
  font-weight: 300;
  line-height: 1.35;
  letter-spacing: -0.025em;
  white-space: pre-line;
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
  font-size: clamp(18px, 1vw, 30px);
  line-height: 1.25;
  white-space: nowrap;
}

.services-cta-title,
.services-cta-arrow {
  font-size: clamp(46px, 6.2vw, 168px);
  font-weight: 300;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.services-cta-title {
  overflow-wrap: anywhere;
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
    padding-right: max(70px, calc(env(safe-area-inset-right) + 60px));
  }

  .services-list {
    grid-template-columns: 1fr;
  }

  .service-card {
    min-height: 0;
  }

  .services-cta {
    grid-template-columns: minmax(0, 1fr) auto;
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
    grid-template-columns: 1fr;
    padding-top: 24px;
  }

  .services-cta {
    gap: 26px 14px;
    margin-top: 90px;
    padding-right: 4px;
  }

  .services-cta-title,
  .services-cta-arrow {
    font-size: clamp(40px, 11vw, 52px);
  }

  .services-cta-kicker {
    margin-bottom: 6px;
    font-size: 18px;
    line-height: 1.3;
    white-space: normal;
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
