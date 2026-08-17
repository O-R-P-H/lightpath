<template>
  <div class="contacts-page-wrapper">
    <!-- Навигация -->
    <Header />

    <section id="contacts" class="contacts-section" v-if="!loading">
      <BrandLink class="contacts-brand" />

      <!-- Список контактов с уникальным геометрическим смещением по макету -->
      <ul class="contacts-list">
        <li v-for="(contact, index) in contactLinks" :key="contact.type" class="contact-item" :class="`contact-${contact.type}`">
          <a
            :href="contact.href"
            :target="contact.external ? '_blank' : undefined"
            :rel="contact.external ? 'noopener noreferrer' : undefined"
            class="link"
          >
            <ContactIcon :type="contact.type" />
            <span class="contact-label">{{ animatedLabels[index] }}</span>
            <span class="contact-value">{{ contact.value }}</span>
            <span class="contact-arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>

      <p v-if="contactLinks.length === 0" class="contacts-empty">
        Контакты скоро появятся.
      </p>

      <!-- Маленькая подпись снизу -->
      <div class="bottom-signature m-vertical">
        <span>{{ bottomText }}</span>
      </div>
    </section>

    <!-- Лоадер -->
    <div class="contacts-loading" v-else>
      <span class="loading-text">Загрузка контактов...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Header from '../components/Header.vue'
import BrandLink from '../components/BrandLink.vue'
import ContactIcon from '../components/ContactIcon.vue'
import { DIRECTUS_URL } from '../utils/directus'
import { getContactLinks } from '../config/contacts'

const loading = ref(true)

const contactLinks = ref([])
const animatedLabels = ref(contactLinks.value.map(() => ''))
const bottomText = ref('Открыты к новым проектам')

const glyphs = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_*?@#$%"

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
            if (index < iterations - 3) return char
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

const fetchContacts = async () => {
  try {
    const fields = 'phone,email,telegram_url,max_url,whatsapp_url,bottom_text'
    const response = await fetch(`${DIRECTUS_URL}/items/contacts?fields=${fields}`)
    if (!response.ok) throw new Error(`CMS returned ${response.status}`)

    const { data } = await response.json()
    contactLinks.value = getContactLinks(data)
    if (data?.bottom_text?.trim()) bottomText.value = data.bottom_text.trim()
  } catch (error) {
    console.error('Ошибка получения контактов из Directus:', error)
  } finally {
    loading.value = false

    animatedLabels.value = contactLinks.value.map(() => '')
    contactLinks.value.forEach((contact, index) => {
      const reactiveWrapper = {
        get value() { return animatedLabels.value[index] },
        set value(value) { animatedLabels.value[index] = value },
      }
      runScramble(contact.label, reactiveWrapper, 100 + index * 150)
    })
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  fetchContacts()
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
.contacts-page-wrapper {
  background: transparent;
  color: #f1f1f0;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

/* Секция контактов в точности по координатам референса */
.contacts-section {
  padding: 0 var(--space-s);
  align-items: center;
  min-height: 100vh;
  display: grid;
  position: relative;
  box-sizing: border-box;
}

.contacts-brand {
  position: absolute;
  top: var(--space-s);
  left: var(--space-s);
  z-index: 2;
  font-size: 0.72rem;
}

.contacts-list {
  justify-content: space-between;
  align-items: stretch;
  gap: var(--space-l);
  flex-direction: column;
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
}

.contact-item {
  justify-content: center;
  align-items: center;
  display: flex;
}

.link {
  color: var(--color-front, #f1f1f0);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  display: inline-flex;
  align-items: center;
  gap: 1vw;
  letter-spacing: 0;
}

.link > .contact-label {
  display: inline-block;
  font-size: 1.75vw !important;
  font-weight: 300 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.02em !important;
  padding: var(--space-s) 0;
  transition: transform .3s;
}

.link > svg {
  font-size: 1.75vw;
}

.contact-value {
  font-size: 0.9vw;
  letter-spacing: 0;
  opacity: 0.56;
}

.contact-arrow {
  font-size: 1vw;
  opacity: 0.7;
}

.contacts-empty {
  margin: auto;
  font-size: 1.25vw;
  font-weight: 300;
  opacity: 0.56;
}

@media (hover: hover) {
  .link:hover > .contact-label {
    transform: rotateX(180deg);
  }
}

/* Фиксированная подпись внизу */
.bottom-signature {
  position: absolute;
  bottom: var(--space-s);
}

.bottom-signature > span {
  font-size: 0.48vw !important;
  font-weight: 300;
  opacity: 0.6;
  letter-spacing: 0;
}

/* --- ГЕОМЕТРИЧЕСКОЕ СМЕЩЕНИЕ ДЛЯ ДЕСКТОПОВ (>= 760px) --- */
@media (min-width: 760px) {
  .contacts-section {
    padding-top: calc(0.72rem + 2rem); /* Оставляем место вверху под шапку */
    padding-bottom: 3rem;
  }

  .contacts-list {
    height: 100%;
  }

  .contact-telegram {
    justify-content: flex-start;
  }

  .contact-max {
    padding-right: 25%;
    justify-content: center;
  }

  .contact-email {
    padding-left: 18%;
    justify-content: center;
  }

  .contact-whatsapp {
    padding-left: 8%;
    justify-content: center;
  }

  .contact-phone {
    justify-content: flex-end;
  }

  /* Подпись внизу слева */
  .bottom-signature {
    left: var(--space-s);
  }
}

/* --- НАСТРОЙКИ ДЛЯ МОБИЛЬНЫХ (<= 759px) --- */
@media (max-width: 759px) {
  .contacts-section {
    min-height: 100svh;
    padding: 88px 20px 72px;
  }

  .contacts-brand {
    top: 16px;
    left: 20px;
    max-width: calc(100% - 96px);
    font-size: clamp(18px, 5.2vw, 22px);
  }

  .contacts-list {
    gap: 0;
    border-top: 1px solid rgba(241, 241, 240, 0.16);
  }

  .link > .contact-label {
    padding: 0;
    font-size: clamp(18px, 5vw, 21px) !important;
    line-height: 1.2 !important;
  }

  .contact-value {
    display: block;
    grid-column: 2;
    min-width: 0;
    font-size: 13px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .contact-item {
    display: block;
    padding: 0;
    border-bottom: 1px solid rgba(241, 241, 240, 0.16);
  }

  .link {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 3px 12px;
    width: 100%;
    min-height: 70px;
    padding: 12px 0;
  }

  .link > svg {
    grid-row: 1 / 3;
    align-self: center;
    font-size: 25px;
  }

  .contact-arrow {
    grid-column: 3;
    grid-row: 1 / 3;
    align-self: center;
    font-size: 18px;
  }

  /* Подпись внизу справа на мобильных */
  .bottom-signature {
    right: 20px;
    bottom: 16px;
    max-width: calc(100% - 40px);
  }

  .bottom-signature > span {
    font-size: 12px !important;
  }

  .contacts-empty {
    font-size: 20px;
  }

}

/* Лоадер */
.contacts-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  min-height: 50vh;
}

.loading-text {
  font-size: 1.2rem;
  font-weight: 300;
  opacity: 0.5;
}

@media (max-width: 759px) {
  .contacts-loading {
    min-height: 100svh;
    padding: 80px 20px 40px;
  }

  .loading-text {
    font-size: 16px;
    line-height: 1.4;
    text-align: center;
  }
}
</style>
