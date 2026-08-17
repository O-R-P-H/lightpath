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
          <template v-if="serviceItems.length">
            <div class="services-workspace">
              <article v-if="selectedService" :id="`service-${String(selectedIndex + 1).padStart(2, '0')}`" class="service-detail">
                <div class="service-detail-meta">
                  <span>{{ String(selectedIndex + 1).padStart(2, '0') }}</span>
                  <span v-if="selectedService.duration">Срок предоставления услуги · {{ selectedService.duration }}</span>
                </div>
                <div class="service-detail-copy">
                  <h1>{{ selectedService.title }}</h1>
                  <p v-if="selectedService.description">{{ selectedService.description }}</p>
                </div>
                <div v-if="selectedService.includes" class="service-detail-row">
                  <span>Что входит</span><p>{{ selectedService.includes }}</p>
                </div>
                <div class="service-detail-row service-detail-price">
                  <span>Стоимость</span><p>{{ selectedService.price || 'По запросу' }}</p>
                </div>
              </article>

              <nav class="service-navigation" aria-label="Список услуг">
                <button v-for="(service, index) in serviceItems" :key="`${service.title}-${index}`" class="service-navigation-item" :class="{ active: selectedIndex === index }" type="button" :aria-current="selectedIndex === index ? 'true' : undefined" @click="selectService(index)">
                  <span class="service-navigation-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span>{{ navigationTitle(service.title) }}</span>
                </button>
              </nav>
            </div>

            <div class="services-accordion">
              <article v-for="(service, index) in serviceItems" :id="`service-mobile-${String(index + 1).padStart(2, '0')}`" :key="`${service.title}-${index}`" class="accordion-item" :class="{ open: openMobileIndex === index }">
                <button class="accordion-trigger" type="button" :aria-expanded="openMobileIndex === index" :aria-controls="`service-mobile-panel-${index}`" @click="toggleMobileService(index)">
                  <span>{{ String(index + 1).padStart(2, '0') }}</span><span>{{ navigationTitle(service.title) }}</span><span aria-hidden="true">{{ openMobileIndex === index ? '−' : '+' }}</span>
                </button>
                <div v-show="openMobileIndex === index" :id="`service-mobile-panel-${index}`" class="accordion-panel">
                  <p v-if="service.duration" class="accordion-duration">Срок предоставления услуги · {{ service.duration }}</p>
                  <p v-if="service.description">{{ service.description }}</p>
                  <div v-if="service.includes" class="accordion-row"><span>Что входит</span><p>{{ service.includes }}</p></div>
                  <div class="accordion-row"><span>Стоимость</span><p>{{ service.price || 'По запросу' }}</p></div>
                </div>
              </article>
            </div>
          </template>
          <div v-else class="services-empty">Список услуг скоро появится.</div>

          <router-link class="services-cta" to="/contacts">
            <span class="services-cta-kicker">Есть задача?</span><span class="services-cta-title">Обсудить проект</span><span class="services-cta-arrow" aria-hidden="true">↗</span>
          </router-link>
        </div>
        <div v-else-if="error" class="services-loading"><span class="loading-text">Не удалось загрузить услуги. Попробуйте обновить страницу.</span></div>
        <div v-else class="services-loading"><span class="loading-text">Загрузка услуг...</span></div>
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
const selectedIndex = ref(0)
const openMobileIndex = ref(null)
const route = useRoute()
const cleanText = (value) => typeof value === 'string' ? value.trim() : ''

const serviceItems = computed(() => Array.isArray(rawServiceItems.value)
  ? rawServiceItems.value.map((item) => ({
    title: cleanText(item?.title), description: cleanText(item?.description), includes: cleanText(item?.includes), duration: cleanText(item?.duration), price: cleanText(item?.price),
  })).filter((item) => item.title)
  : [])
const selectedService = computed(() => serviceItems.value[selectedIndex.value] || null)
const navigationTitle = (title) => title === 'Аудит световой среды' ? 'Аудит' : title
const selectService = (index) => { selectedIndex.value = index }
const toggleMobileService = (index) => { openMobileIndex.value = openMobileIndex.value === index ? null : index }

const selectFromHash = () => {
  const match = route.hash.match(/^#service-(\d+)$/)
  if (!match) return
  const index = Number(match[1]) - 1
  if (index >= 0 && index < serviceItems.value.length) {
    selectedIndex.value = index
    openMobileIndex.value = index
  }
}

const fetchServicesData = async () => {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/services?fields=service_items`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`CMS returned ${response.status}`)
    const { data } = await response.json()
    rawServiceItems.value = data?.service_items || []
    await nextTick()
    selectFromHash()
  } catch (err) {
    console.error('Ошибка при загрузке данных об услугах из Directus:', err)
    error.value = true
  } finally { loading.value = false }
}

onMounted(() => { document.documentElement.classList.add('reference-root-active'); fetchServicesData() })
onUnmounted(() => { document.documentElement.classList.remove('reference-root-active') })
</script>

<style scoped>
.services-page-wrapper { min-height: 100vh; overflow-x: hidden; color: var(--color-front, #f1f1f0); }
.services-section { min-height: 100vh; padding: max(var(--space-s), env(safe-area-inset-top)) max(var(--space-s), env(safe-area-inset-right)) max(var(--space-s), env(safe-area-inset-bottom)) max(var(--space-s), env(safe-area-inset-left)); border-top: 1px solid var(--color-line); }
.services-shell { width: min(100%, 2400px); margin: 0 auto; }
.services-grid-header, .services-workspace { display: grid; grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr); gap: var(--space-m); }
.services-grid-header { padding-right: max(70px, calc(env(safe-area-inset-right) + 56px)); padding-bottom: clamp(54px, 7vw, 180px); }
.services-main-title, .services-sec-title { margin: 0; color: #fff; font-size: 1rem; font-weight: 400; line-height: 1; letter-spacing: -.035em; }
.service-detail { display: flex; min-width: 0; min-height: min(70vh, 1100px); padding: clamp(28px, 2.8vw, 84px); border: 1px solid var(--color-line); background: radial-gradient(circle at 90% 0%, rgba(112, 107, 205, .13), transparent 45%), rgba(7, 8, 18, .28); flex-direction: column; }
.service-detail-meta, .service-detail-row { display: grid; grid-template-columns: minmax(120px, .35fr) minmax(0, 1fr); gap: clamp(18px, 1.8vw, 54px); }
.service-detail-meta, .service-detail-row > span, .accordion-row > span { color: rgba(241, 241, 240, .55); font-size: clamp(13px, .68vw, 25px); font-weight: 300; line-height: 1.3; letter-spacing: .055em; text-transform: uppercase; }
.service-detail-meta > span:last-child { text-align: right; }
.service-detail-copy { padding: clamp(64px, 8vw, 190px) 0 clamp(42px, 5vw, 130px); }
.service-detail-copy h1 { max-width: 14ch; margin: 0; font-size: clamp(44px, 3.7vw, 106px); font-weight: 300; line-height: .98; letter-spacing: -.055em; text-wrap: balance; overflow-wrap: anywhere; }
.service-detail-copy p, .service-detail-row p { margin: 0; white-space: pre-line; }
.service-detail-copy p { max-width: 54ch; margin-top: clamp(28px, 3vw, 78px); color: rgba(241, 241, 240, .76); font-size: clamp(18px, 1vw, 34px); font-weight: 300; line-height: 1.42; letter-spacing: 0; word-spacing: .06em; }
.service-detail-row { padding: clamp(22px, 2vw, 56px) 0; border-top: 1px solid var(--color-line); }
.service-detail-row p { color: rgba(241, 241, 240, .84); font-size: clamp(17px, .84vw, 29px); font-weight: 300; line-height: 1.48; letter-spacing: 0; word-spacing: .08em; }
.service-detail-price { margin-top: auto; padding-bottom: 0; }
.service-detail-price p { color: #f1f1f0; font-size: clamp(22px, 1.25vw, 42px); line-height: 1.35; }
.service-navigation { align-self: start; border-top: 1px solid var(--color-line); }
.service-navigation-item { display: grid; grid-template-columns: minmax(40px, .28fr) minmax(0, 1fr); gap: 12px; width: 100%; min-height: clamp(50px, 3.7vw, 120px); padding: 10px 0; border: 0; border-bottom: 1px solid var(--color-line); color: rgba(241, 241, 240, .58); background: transparent; font: inherit; font-size: clamp(19px, 1.35vw, 52px); font-weight: 300; line-height: 1.04; letter-spacing: -.035em; text-align: left; cursor: pointer; transition: color .25s ease, padding-left .25s ease; }
.service-navigation-number { color: rgba(241, 241, 240, .42); font-size: .4em; letter-spacing: .04em; }
.service-navigation-item.active, .service-navigation-item:hover { padding-left: .12em; color: #fff; }
.services-accordion { display: none; }
.services-empty { padding: clamp(48px, 6vw, 160px) 0; border-top: 1px solid var(--color-line); border-bottom: 1px solid var(--color-line); font-size: clamp(24px, 2vw, 52px); font-weight: 300; opacity: .58; }
.services-cta { display: grid; grid-template-columns: minmax(120px, .62fr) minmax(0, 2.15fr) auto; gap: clamp(24px, 4vw, 110px); align-items: end; margin-top: clamp(80px, 10vw, 280px); padding: clamp(30px, 4vw, 100px) 0 clamp(50px, 6vw, 150px); border-top: 1px solid var(--color-line); color: inherit; text-decoration: none; }
.services-cta-kicker { align-self: start; color: rgba(241, 241, 240, .58); font-size: clamp(18px, 1vw, 30px); line-height: 1.3; }
.services-cta-title, .services-cta-arrow { font-size: clamp(46px, 6.2vw, 168px); font-weight: 300; line-height: .9; letter-spacing: -.06em; }
.services-cta-title { overflow-wrap: anywhere; }
.services-loading { display: grid; min-height: 75vh; place-items: center; }
.loading-text { max-width: 40ch; font-size: clamp(18px, 1vw, 32px); font-weight: 300; line-height: 1.35; text-align: center; opacity: .5; }
@media (hover: hover) { .services-cta:hover .services-cta-arrow { transform: translate(8px, -8px); } .services-cta-arrow { transition: transform .22s ease; } }
@media (max-width: 759px) {
  .services-section { padding: 16px max(20px, env(safe-area-inset-right)) max(28px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); }
  .services-grid-header { grid-template-columns: 1fr; gap: 8px; padding: 0 56px 54px 0; }
  .services-main-title, .services-sec-title { font-size: clamp(18px, 5.2vw, 23px); }
  .services-workspace { display: none; }
  .services-accordion { display: block; border-top: 1px solid var(--color-line); }
  .accordion-item { border-bottom: 1px solid var(--color-line); }
  .accordion-trigger { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 10px; align-items: baseline; width: 100%; padding: 17px 0 16px; border: 0; color: #f1f1f0; background: transparent; font: inherit; font-size: clamp(23px, 6.8vw, 32px); font-weight: 300; line-height: 1; letter-spacing: -.045em; text-align: left; }
  .accordion-trigger > span:first-child, .accordion-trigger > span:last-child { color: rgba(241, 241, 240, .5); font-size: .48em; }
  .accordion-trigger > span:last-child { font-size: 1em; line-height: .7; }
  .accordion-panel { padding: 5px 0 24px 44px; }
  .accordion-panel > p { margin: 0; color: rgba(241, 241, 240, .78); font-size: 16px; font-weight: 300; line-height: 1.48; letter-spacing: 0; word-spacing: .06em; white-space: pre-line; }
  .accordion-duration { margin-bottom: 22px !important; color: rgba(241, 241, 240, .52) !important; font-size: 12px !important; letter-spacing: .04em !important; text-transform: uppercase; }
  .accordion-row { display: grid; grid-template-columns: 1fr; gap: 9px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--color-line); }
  .accordion-row > p { margin: 0; color: #f1f1f0; font-size: 16px; font-weight: 300; line-height: 1.45; letter-spacing: 0; white-space: pre-line; }
  .services-cta { grid-template-columns: minmax(0, 1fr) auto; gap: 24px 14px; margin-top: 90px; padding-right: 4px; }
  .services-cta-kicker { grid-column: 1 / -1; font-size: 18px; }
  .services-cta-title, .services-cta-arrow { font-size: clamp(40px, 11vw, 52px); }
}
</style>

<style>
html.reference-root-active { margin: 0; padding: 0; background-color: #090a16; scroll-behavior: smooth; font-family: 'Inter', sans-serif !important; font-size: clamp(28px, 7.5vw, 58px) !important; line-height: 1 !important; letter-spacing: -0.04em; --space-s: .2rem; --space-m: .66rem; --space-l: 1rem; --color-front: #f1f1f0; --color-back: #090a16; --color-line: rgba(180, 182, 224, .22); }
@media (min-width: 760px) { html.reference-root-active { font-size: clamp(36px, 3vw, 116px) !important; } }
@media (min-width: 2600px) { html.reference-root-active { font-size: clamp(116px, 4vw, 168px) !important; } }
html.reference-root-active body { min-height: 100vh; margin: 0; padding: 0; font-family: 'Inter', sans-serif !important; }
</style>
