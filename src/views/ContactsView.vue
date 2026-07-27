<template>
  <div class="contacts-page-wrapper">
    <!-- Навигация -->
    <Header />

    <section id="contacts" class="contacts-section" v-if="!loading">
      <!-- Список контактов с уникальным геометрическим смещением по макету -->
      <ul class="contacts-list">
        <li class="contact-item">
          <a :href="contactsData.telegram_url" target="_blank" rel="noopener" class="link">
            <span>{{ labelTelegram }}</span>
          </a>
        </li>
        <li class="contact-item">
          <a :href="contactsData.instagram_url" target="_blank" rel="noopener" class="link">
            <span>{{ labelInstagram }}</span>
          </a>
        </li>
        <li class="contact-item">
          <a :href="`mailto:${contactsData.email}`" class="link">
            <span>{{ labelEmail }}</span>
          </a>
        </li>
        <li class="contact-item">
          <a :href="`tel:${contactsData.phone}`" class="link">
            <span>{{ labelPhone }}</span>
          </a>
        </li>
      </ul>

      <!-- Маленькая подпись снизу -->
      <div class="bottom-signature m-vertical">
        <span>{{ contactsData.bottom_text }}</span>
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

const loading = ref(true)

// Реактивные переменные для анимации дешифрования названий соцсетей
const labelTelegram = ref("")
const labelInstagram = ref("")
const labelEmail = ref("")
const labelPhone = ref("")

const glyphs = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_*?@#$%"

// Демонстрационные данные на случай, если CMS еще пустая
const contactsData = ref({
  telegram_url: 'https://t.me/matsnev_light',
  instagram_url: 'https://instagram.com/matsnev.lighting',
  email: 'hello@matsnev.light',
  phone: '+79991234567',
  bottom_text: 'Свяжитесь со мной ✌︎'
})

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
    const response = await fetch(`https://lightcms.tsukawa.ru/items/contacts?t=${Date.now()}`)
    if (response.ok) {
      const { data } = await response.json()
      // Записываем данные из CMS
      contactsData.value = data
    }
  } catch (error) {
    console.error('Ошибка получения контактов из Directus, используем демо-данные:', error)
  } finally {
    loading.value = false

    // Запуск красивой анимации проявления контактов при загрузке
    runScramble("Telegram", labelTelegram, 100)
    runScramble("Instagram", labelInstagram, 250)
    runScramble("Email", labelEmail, 400)
    runScramble("Телефон", labelPhone, 550) // Адаптировано под русские символы
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
  background-color: #0e0e0f;
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

.contacts-list {
  justify-content: space-between;
  align-items: stretch;
  gap: var(--space-l);
  flex-direction: column;
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
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
}

.link > span {
  display: inline-block;
  font-size: 1.35vw !important; /* Крупный бруталистичный размер хедера */
  font-weight: 300 !important;
  line-height: 1.4 !important;
  letter-spacing: -0.02em !important;
  padding: var(--space-s) 0;
  transition: transform .3s;
}

@media (hover: hover) {
  .link:hover > span {
    transform: rotateX(180deg);
  }
}

/* Фиксированная подпись внизу */
.bottom-signature {
  position: absolute;
  bottom: var(--space-s);
}

.bottom-signature > span {
  font-size: 14px !important;
  font-weight: 300;
  opacity: 0.6;
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

  /* Ссылка 1 (Telegram) прижата к левому краю */
  .contact-item:first-child {
    justify-content: flex-start;
  }

  /* Ссылка 2 (Instagram) смещена вправо на 25% */
  .contact-item:nth-child(2) {
    padding-right: 25%;
    justify-content: center;
  }

  /* Ссылка 3 (Email) смещена влево на 25% */
  .contact-item:nth-child(3) {
    padding-left: 25%;
    justify-content: center;
  }

  /* Ссылка 4 (Телефон) прижата к правому краю */
  .contact-item:nth-child(4) {
    justify-content: flex-end;
  }

  /* Подпись внизу слева */
  .bottom-signature {
    left: var(--space-s);
  }
}

/* --- НАСТРОЙКИ ДЛЯ МОБИЛЬНЫХ (<= 759px) --- */
@media (max-width: 759px) {
  .link > span {
    font-size: 1.1rem !important;
  }

  .contact-item {
    padding: var(--space-s) 0;
  }

  /* Подпись внизу справа на мобильных */
  .bottom-signature {
    right: var(--space-s);
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
</style>
