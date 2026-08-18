import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE_URL = 'https://nikolaym.online'
const CMS_URL = 'https://cms.nikolaym.online'
const scriptDir = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(scriptDir, '..', 'public')
const generatedFiles = ['llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml']

const decodeEntities = (value = '') => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&laquo;/gi, '«')
  .replace(/&raquo;/gi, '»')
  .replace(/&mdash;/gi, '—')
  .replace(/&ndash;/gi, '–')
  .replace(/&hellip;/gi, '…')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const htmlToText = (value = '') => decodeEntities(value)
  .replace(/<\s*br\s*\/?\s*>/gi, '\n')
  .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, '\n')
  .replace(/<li[^>]*>/gi, '- ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[\t ]+/g, ' ')
  .replace(/ *\n */g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const singleLine = (value = '') => htmlToText(value).replace(/\s+/g, ' ').trim()
const xmlEscape = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const fetchData = async (path) => {
  const response = await fetch(`${CMS_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`${path}: CMS returned ${response.status}`)
  const payload = await response.json()
  return payload?.data
}

const compactDescription = (value, fallback) => {
  const text = singleLine(value)
  if (!text) return fallback
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text
}

const projectCountLabel = (count) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} проект`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} проекта`
  return `${count} проектов`
}

const formatService = (service, index) => {
  const number = String(index + 1).padStart(2, '0')
  const lines = [
    `## ${number}. ${singleLine(service.title)}`,
    '',
    `URL: ${SITE_URL}/gallery#service-${number}`,
  ]
  if (service.duration) lines.push(`Срок: ${singleLine(service.duration)}`)
  if (service.description) lines.push('', singleLine(service.description))
  if (service.includes) lines.push('', '### Что входит', '', singleLine(service.includes))
  lines.push('', '### Стоимость', '', singleLine(service.price) || 'По запросу')
  return lines.join('\n')
}

const formatProject = (project) => {
  const title = singleLine(project.title)
  const year = singleLine(project.year)
  const lines = [
    `### ${title}`,
    '',
    `URL: ${SITE_URL}/projects/${project.id}`,
  ]
  if (year) lines.push(`Год: ${year}`)
  const description = htmlToText(project.content)
  if (description) lines.push('', description)
  return lines.join('\n')
}

const buildFiles = ({ services, projects, about, contacts }) => {
  const serviceItems = Array.isArray(services?.service_items)
    ? services.service_items.filter((item) => singleLine(item?.title))
    : []
  const projectItems = Array.isArray(projects)
    ? projects.filter((item) => item?.id && singleLine(item?.title))
    : []
  const years = [...new Set(projectItems.map((item) => singleLine(item.year)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a, 'ru', { numeric: true }))
  const aboutText = htmlToText(about?.title)

  const llms = [
    '# Студия светового дизайна Мацнева Николая',
    '',
    '> Студия Николая Мацнева проектирует освещение интерьеров, фасадов, ландшафтов и коммерческих пространств: от аудита и концепции до поставки оборудования, монтажа и реализации.',
    '',
    'Официальный сайт студии. Основной язык материалов — русский. Актуальные услуги и проекты загружаются из собственной CMS.',
    '',
    '## Основные разделы',
    '',
    `- [Главная](${SITE_URL}/): Интерактивная демонстрация сценариев архитектурного освещения и перечень услуг.`,
    `- [О студии](${SITE_URL}/about): Информация о Николае Мацневе, опыте и подходе к световому дизайну.`,
    `- [Услуги](${SITE_URL}/gallery): Состав, сроки и стоимость услуг студии.`,
    `- [Проекты](${SITE_URL}/projects): Портфолио реализованных проектов освещения.`,
    `- [Контакты](${SITE_URL}/contacts): Способы связи и обсуждения проекта.`,
    '',
    '## Услуги',
    '',
    ...serviceItems.map((service, index) => {
      const number = String(index + 1).padStart(2, '0')
      return `- [${singleLine(service.title)}](${SITE_URL}/gallery#service-${number}): ${compactDescription(service.description, 'Описание, состав, срок и стоимость услуги.')}`
    }),
    '',
    '## Портфолио',
    '',
    `- [Все проекты](${SITE_URL}/projects): ${projectCountLabel(projectItems.length)} в текущем портфолио.`,
    ...years.map((year) => `- [Проекты ${year} года](${SITE_URL}/projects/year/${encodeURIComponent(year)}): Работы студии за ${year} год.`),
    '',
    '## Машиночитаемые материалы',
    '',
    `- [Полное описание студии, услуг и проектов](${SITE_URL}/llms-full.txt): Расширенный Markdown-контекст для AI-систем.`,
    `- [Sitemap](${SITE_URL}/sitemap.xml): Полный список индексируемых URL.`,
  ].join('\n')

  const contactLines = [
    contacts?.phone ? `- Телефон: ${singleLine(contacts.phone)}` : '',
    contacts?.telegram_url ? `- Telegram: ${singleLine(contacts.telegram_url)}` : '',
    contacts?.whatsapp_url ? `- WhatsApp: ${singleLine(contacts.whatsapp_url)}` : '',
    contacts?.max_url ? `- MAX: ${singleLine(contacts.max_url)}` : '',
  ].filter(Boolean)

  const llmsFull = [
    '# Студия светового дизайна Мацнева Николая — полное описание',
    '',
    '> Официальный расширенный контекст сайта nikolaym.online для поисковых систем, AI-ассистентов и агентов. Данные об услугах и портфолио получены из CMS студии.',
    '',
    `Канонический адрес: ${SITE_URL}/`,
    'Язык: русский',
    'Направление: световой дизайн, архитектурное освещение, проектирование освещения, комплектация, поставка и монтаж светового оборудования.',
    '',
    '## О студии',
    '',
    aboutText || 'Студия светового дизайна Николая Мацнева.',
    '',
    '## Услуги',
    '',
    ...serviceItems.flatMap((service, index) => [formatService(service, index), '']),
    '## Проекты',
    '',
    `В портфолио опубликовано проектов: ${projectItems.length}.`,
    '',
    ...projectItems
      .sort((a, b) => String(b.year || '').localeCompare(String(a.year || ''), 'ru', { numeric: true }) || String(a.title).localeCompare(String(b.title), 'ru'))
      .flatMap((project) => [formatProject(project), '']),
    '## Контакты',
    '',
    ...contactLines,
    `- Страница контактов: ${SITE_URL}/contacts`,
    '',
    '## Правила интерпретации',
    '',
    '- Этот файл описывает только официальные материалы студии на nikolaym.online.',
    '- Для точных условий, сроков и стоимости следует использовать актуальные данные соответствующей услуги и связаться со студией.',
    '- Пустые поля проектов не следует дополнять предположениями.',
  ].join('\n')

  const staticUrls = ['/', '/about', '/gallery', '/projects', '/contacts']
  const sitemapUrls = [
    ...staticUrls,
    ...years.map((year) => `/projects/year/${encodeURIComponent(year)}`),
    ...projectItems.map((project) => `/projects/${project.id}`),
  ]
  const lastmod = new Date().toISOString().slice(0, 10)
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map((path) => [
      '  <url>',
      `    <loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
  ].join('\n')

  const robots = [
    'User-agent: YandexAdditional',
    'Allow: /',
    '',
    'User-agent: YandexAdditionalBot',
    'Allow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join('\n')

  return {
    'llms.txt': `${llms.trim()}\n`,
    'llms-full.txt': `${llmsFull.trim()}\n`,
    'robots.txt': `${robots.trim()}\n`,
    'sitemap.xml': `${sitemap.trim()}\n`,
  }
}

const main = async () => {
  await mkdir(publicDir, { recursive: true })
  try {
    const [services, projects, about, contacts] = await Promise.all([
      fetchData('/items/services?fields=service_items'),
      fetchData('/items/projects?fields=id,title,year,content,is_in_menu&limit=-1'),
      fetchData('/items/about?fields=title'),
      fetchData('/items/contacts?fields=phone,email,telegram_url,max_url,whatsapp_url,bottom_text'),
    ])
    const files = buildFiles({ services, projects, about, contacts })
    await Promise.all(Object.entries(files).map(([name, content]) => writeFile(resolve(publicDir, name), content, 'utf8')))
    console.log(`GEO files generated: ${Object.keys(files).join(', ')}`)
  } catch (error) {
    const existing = await Promise.all(generatedFiles.map(async (name) => {
      try {
        await readFile(resolve(publicDir, name), 'utf8')
        return true
      } catch {
        return false
      }
    }))
    if (existing.every(Boolean)) {
      console.warn(`CMS is unavailable; existing GEO files were preserved. ${error.message}`)
      return
    }
    throw error
  }
}

await main()
