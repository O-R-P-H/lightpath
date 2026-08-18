const SITE_URL = 'https://nikolaym.online'
const SITE_NAME = 'Студия светового дизайна Мацнева Николая'
const DEFAULT_DESCRIPTION = 'Проектирование архитектурного освещения интерьеров, фасадов, ландшафтов и коммерческих пространств: от аудита и концепции до монтажа и реализации.'

const routeMeta = {
  home: {
    title: `${SITE_NAME} — архитектурное освещение`,
    description: DEFAULT_DESCRIPTION,
  },
  about: {
    title: `О Николае Мацневе — ${SITE_NAME}`,
    description: 'О световом дизайнере Николае Мацневе, профессиональном подходе студии и опыте проектирования освещения жилых, общественных и коммерческих объектов.',
  },
  'projects-archive': {
    title: `Проекты освещения — ${SITE_NAME}`,
    description: 'Портфолио студии: архитектурное, интерьерное, фасадное и ландшафтное освещение частных и коммерческих объектов.',
  },
  'projects-archive-legacy': {
    title: `Проекты освещения — ${SITE_NAME}`,
    description: 'Портфолио студии светового дизайна Николая Мацнева.',
    canonicalPath: '/projects',
  },
  'project-detail': {
    title: `Проект освещения — ${SITE_NAME}`,
    description: 'Реализованный проект освещения студии светового дизайна Николая Мацнева.',
  },
  contacts: {
    title: `Контакты — ${SITE_NAME}`,
    description: 'Связаться со студией светового дизайна Николая Мацнева и обсудить аудит, концепцию, проектирование, комплектацию или реализацию освещения.',
  },
  services: {
    title: `Услуги и стоимость — ${SITE_NAME}`,
    description: 'Аудит световой среды, консультация, световая концепция, проект освещения, комплектация, поставка оборудования, монтаж и реализация проекта.',
  },
}

const ensureMeta = (key, value, content) => {
  let element = document.head.querySelector(`meta[${key}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(key, value)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

const ensureCanonical = (href) => {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

const cleanPath = (path = '/') => {
  const normalized = String(path).split(/[?#]/)[0] || '/'
  return normalized === '/' ? '/' : normalized.replace(/\/+$/, '')
}

export const textDescription = (value, fallback = DEFAULT_DESCRIPTION) => {
  let text = String(value || '')
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (typeof document !== 'undefined') {
    const decoder = document.createElement('textarea')
    decoder.innerHTML = text
    text = decoder.value.replace(/\s+/g, ' ').trim()
  } else {
    text = text.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
  }
  if (!text) return fallback
  return text.length > 170 ? `${text.slice(0, 167).trimEnd()}…` : text
}

export const setStructuredData = (data) => {
  let element = document.head.querySelector('#page-structured-data')
  if (!element) {
    element = document.createElement('script')
    element.id = 'page-structured-data'
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }
  element.textContent = JSON.stringify(data)
}

const breadcrumbData = (to, canonicalUrl) => {
  if (to.name === 'home') return null
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
  ]
  if (String(to.name).startsWith('project')) {
    items.push({ '@type': 'ListItem', position: 2, name: 'Проекты', item: `${SITE_URL}/projects` })
    if (to.name === 'projects-by-year') {
      items.push({ '@type': 'ListItem', position: 3, name: String(to.params.year), item: canonicalUrl })
    } else if (to.name === 'project-detail') {
      items.push({ '@type': 'ListItem', position: 3, name: 'Проект', item: canonicalUrl })
    }
  } else {
    const labels = { about: 'Обо мне', services: 'Услуги', contacts: 'Контакты' }
    items.push({ '@type': 'ListItem', position: 2, name: labels[to.name] || 'Страница', item: canonicalUrl })
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }
}

export const applyRouteSeo = (to, overrides = {}) => {
  if (typeof document === 'undefined') return
  const yearMeta = to.name === 'projects-by-year' ? {
    title: `Проекты ${to.params.year} года — ${SITE_NAME}`,
    description: `Проекты освещения студии Николая Мацнева за ${to.params.year} год.`,
  } : null
  const base = yearMeta || routeMeta[to.name] || routeMeta.home
  const title = overrides.title || base.title
  const description = textDescription(overrides.description || base.description)
  const canonicalPath = cleanPath(overrides.canonicalPath || base.canonicalPath || to.path)
  const canonicalUrl = `${SITE_URL}${canonicalPath}`
  const image = overrides.image || ''

  document.title = title
  ensureCanonical(canonicalUrl)
  ensureMeta('name', 'description', description)
  ensureMeta('name', 'robots', 'index, follow, max-image-preview:large')
  ensureMeta('property', 'og:locale', 'ru_RU')
  ensureMeta('property', 'og:type', overrides.type || 'website')
  ensureMeta('property', 'og:site_name', SITE_NAME)
  ensureMeta('property', 'og:title', title)
  ensureMeta('property', 'og:description', description)
  ensureMeta('property', 'og:url', canonicalUrl)
  const existingOgImage = document.head.querySelector('meta[property="og:image"]')
  if (image) ensureMeta('property', 'og:image', image)
  else existingOgImage?.remove()
  ensureMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  ensureMeta('name', 'twitter:title', title)
  ensureMeta('name', 'twitter:description', description)

  setStructuredData(overrides.structuredData || breadcrumbData(to, canonicalUrl) || {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonicalUrl,
  })
}

export { SITE_NAME, SITE_URL }
