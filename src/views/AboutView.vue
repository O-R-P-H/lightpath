<template>
  <div class="about-page-wrapper">
    <!-- Подключаем переиспользуемый хедер навигации -->
    <Header />

    <!-- Секция "Обо мне" -->
    <section id="about" class="about-section">
      <!-- Сетка заголовков (дублирует структуру первого экрана) -->
      <div class="about-grid-header">
        <h2 class="about-main-title">
          Студия светового дизайна <br />
          Мацнева Николая
        </h2>
        <div class="about-sec-title">Обо мне</div>
      </div>

      <!-- Контентная область -->
      <div class="about-content" v-if="!loading">
        <!-- Левая текстовая колонка, получаемая из WYSIWYG-поля title в Directus -->
        <div class="text-container" ref="textContainerRef" v-html="textAbout"></div>

        <!-- Абсолютно позиционированный портрет в правом нижнем углу с компенсацией пустоты PNG -->
        <img
            v-if="photoUrl"
            :src="photoUrl"
            alt="Николай Мацнев"
            class="portrait-img"
        />
      </div>

      <!-- Лоадер на время загрузки данных из CMS -->
      <div class="about-loading" v-else>
        <span class="loading-text">Загрузка...</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import Header from '../components/Header.vue'

const textAbout = ref('')
const photoUrl = ref('')
const loading = ref(true)
const textContainerRef = ref(null)

const glyphs = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789_*?@#$%+=-"

// Рекурсивный поиск текстовых узлов (исключая пустые переносы строк)
const getTextNodes = (node) => {
  const textNodes = []
  const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false)
  let currentNode = walk.nextNode()
  while (currentNode) {
    if (currentNode.nodeValue.trim().length > 0) {
      textNodes.push(currentNode)
    }
    currentNode = walk.nextNode()
  }
  return textNodes
}

// Быстрая покадровая дешифрация контента без повреждения HTML-тегов
const scrambleHTMLContent = (containerElement) => {
  const textNodes = getTextNodes(containerElement)

  textNodes.forEach((node, nodeIndex) => {
    const originalText = node.nodeValue
    const length = originalText.length

    let currentFrame = 0
    const totalFrames = 25 // Каждая строка/абзац дешифруется ровно за 25 кадров (~750мс)!

    // Деликатная задержка между абзацами, чтобы они шли волной сверху вниз
    const delay = nodeIndex * 80

    setTimeout(() => {
      const interval = setInterval(() => {
        currentFrame++
        const progress = currentFrame / totalFrames // От 0.0 до 1.0

        node.nodeValue = originalText
            .split("")
            .map((char, index) => {
              if (char === " " || char === "\n") return char

              // Рассчитываем порог открытия символа на основе текущего кадра
              const charThreshold = index / length
              if (progress >= charThreshold) {
                return char
              }

              return glyphs[Math.floor(Math.random() * glyphs.length)]
            })
            .join("")

        if (currentFrame >= totalFrames) {
          clearInterval(interval)
          node.nodeValue = originalText // Гарантируем полное восстановление оригинального текста
        }
      }, 30) // Скорость тика кадров (30мс - супер-динамично!)
    }, delay)
  })
}

const fetchAboutData = async () => {
  try {
    const response = await fetch('https://lightcms.tsukawa.ru/items/about')
    if (response.ok) {
      const { data } = await response.json()

      // Записываем HTML-текст из CMS
      textAbout.value = data.title

      // Умный автоматический резолвер путей изображений для localhost и сервера
      if (data.photo_about) {
        const path = data.photo_about

        if (path.startsWith('http://') || path.startsWith('https://')) {
          photoUrl.value = path
        } else if (path.includes('assets/')) {
          const cleanPath = path.startsWith('/') ? path.slice(1) : path
          photoUrl.value = `https://lightcms.tsukawa.ru/${cleanPath}`
        } else {
          photoUrl.value = `https://lightcms.tsukawa.ru/assets/${path}`
        }
      }

      // Сначала отключаем лоадер, чтобы Vue смонтировал .text-container в DOM!
      loading.value = false

      // Запускаем дешифрацию строго в следующем тике после монтирования DOM
      nextTick(() => {
        if (textContainerRef.value) {
          // Мгновенно делаем текст видимым при старте анимации
          textContainerRef.value.style.opacity = '1'
          scrambleHTMLContent(textContainerRef.value)
        }
      })
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных из Directus:', error)
    loading.value = false
  }
}

onMounted(() => {
  document.documentElement.classList.add('reference-root-active')
  fetchAboutData()
})

onUnmounted(() => {
  document.documentElement.classList.remove('reference-root-active')
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

.about-page-wrapper {
  background-color: #0e0e0f;
  color: #f1f1f0;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

.about-section {
  box-sizing: border-box;
  position: relative;
  border-top: 1px solid #3b3a39;
  padding: var(--space-s);
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
  min-height: 100vh;
}

/* Сетка заголовка секции (идентична шапке) */
.about-grid-header {
  display: grid;
  grid-template-columns: minmax(0, 2.06fr) minmax(0, 1fr);
  gap: var(--space-m);
  width: 100%;
}

.about-main-title, .about-sec-title {
  margin: 0;
  padding: 0;
  font-size: 0.72rem; /* Оригинальный мелкий бруталистичный размер хедера */
  font-weight: 400;
  color: #fff;
  letter-spacing: -.04em;
  line-height: 1;
}

@media (max-width: 759px) {
  .about-grid-header {
    grid-template-columns: 1fr;
    gap: var(--space-s);
  }
  .about-main-title, .about-sec-title {
    font-size: 1.25rem;
  }
}

/* Контентная область */
.about-content {
  position: relative;
  z-index: 2;
  width: 100%;
  margin-top: var(--space-m);
  flex-grow: 1;
}

.text-container {
  width: 100%;
  position: relative;
  z-index: 2;
  opacity: 0; /* Скрываем текст до старта анимации, чтобы убрать мигание */
  transition: opacity 0.2s ease;
}

@media (min-width: 1024px) {
  .text-container {
    /* Широкий текстовый блок по макету (около 78% ширины экрана) */
    max-width: 78% !important;
  }
}

/*
  Абсолютное позиционирование портрета.
  Сдвиг right: -80px полностью нивелирует пустые поля в файле png, прижимая его вплотную к краю.
*/
.portrait-img {
  position: absolute;
  bottom: 0;
  right: -80px; /* Сдвиг на 80px вправо для идеальной компенсации полей в PNG */
  height: 70vh; /* Установили высоту 70% от высоты экрана по макету */
  width: auto;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}

@media (max-width: 1023px) {
  .portrait-img {
    height: 45vh;
    right: -20px;
    opacity: 0.25; /* Полупрозрачный фон на телефонах во избежание перекрытия */
  }
}

/* Стилизация лоадера загрузки */
.about-loading {
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

<style>
/*
  ГЛОБАЛЬНЫЙ БЛОК СТИЛЕЙ (Unscoped)
  Защищает верстку от огромных 40px шрифтов.
  Весь текст (включая цитаты) теперь выводится в едином стиле 20px на десктопе.
*/

/* --- НАСТРОЙКИ ДЛЯ КОМПЬЮТЕРОВ (Шрифт строго 20px, весь текст в одном стиле по вашему макету) --- */
@media (min-width: 760px) {
  html.reference-root-active #about .text-container * {
    font-size: 20px !important; /* Строго 20px по вашему макету для всех элементов */
    font-weight: 300 !important;
    line-height: 1.6 !important;
    letter-spacing: -0.01em !important;
    word-spacing: 0.12em !important;
    margin: 0 0 16px 0 !important; /* Увеличили отступ пропорционально шрифту */
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }

  /* Восстановление маркеров списка из WYSIWYG на десктопе */
  html.reference-root-active #about .text-container ul {
    list-style: disc !important; /* Возвращаем стандартные круглые маркеры */
    margin: 0 0 28px 0 !important;
    padding-left: 20px !important; /* Добавляем левый отступ, чтобы маркеры влезли */
  }

  html.reference-root-active #about .text-container li {
    font-size: 20px !important;
    font-weight: 300 !important;
    line-height: 1.6 !important;
    list-style: disc !important; /* Дублируем показ точек */
    margin-bottom: 12px !important; /* Вертикальный отступ между li */
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }
}

/* --- НАСТРОЙКИ ДЛЯ ТЕЛЕФОНОВ (Комфортные 17px, весь текст в одном стиле) --- */
@media (max-width: 759px) {
  html.reference-root-active #about .text-container * {
    font-size: 17px !important;
    font-weight: 300 !important;
    line-height: 1.5 !important;
    letter-spacing: -0.01em !important;
    margin: 0 0 12px 0 !important;
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }

  /* Восстановление маркеров списков на мобильных телефонах */
  html.reference-root-active #about .text-container ul {
    list-style: disc !important;
    margin: 0 0 20px 0 !important;
    padding-left: 20px !important;
  }

  html.reference-root-active #about .text-container li {
    font-size: 17px !important;
    font-weight: 300 !important;
    line-height: 1.5 !important;
    list-style: disc !important;
    margin-bottom: 10px !important;
    color: #f1f1f0 !important;
    opacity: 0.9 !important;
  }
}

/* Резиновый масштаб страницы и передача глобальных переменных */
html.reference-root-active {
  scroll-behavior: smooth;
  letter-spacing: -.04em;
  background-color: #0e0e0f;
  margin: 0;
  padding: 0;
  font-size: 7.5vw !important;
  line-height: 1 !important;

  /* Принудительно перебиваем шрифт на Inter для всех дочерних элементов */
  font-family: 'Inter', sans-serif !important;

  /* Передаем переменные глобально */
  --space-s: .2rem;
  --space-m: .66rem;
  --space-l: 1rem;
  --color-front: #f1f1f0;
  --color-back: #0e0e0f;
  --color-line: #3b3a39;
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
