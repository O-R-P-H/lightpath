const CMS_URL = 'https://lightcms.tsukawa.ru'
const PUBLIC_KEY = 'https://disk.yandex.ru/d/xiqXarQXixLTbg'
const email = process.env.LIGHTPATH_CMS_EMAIL
const password = process.env.LIGHTPATH_CMS_PASSWORD

if (!email || !password) throw new Error('Set LIGHTPATH_CMS_EMAIL and LIGHTPATH_CMS_PASSWORD')

const authResponse = await fetch(`${CMS_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const auth = await authResponse.json()
const headers = { Authorization: `Bearer ${auth.data.access_token}`, 'Content-Type': 'application/json' }

const getYandexResource = async (path) => {
  const params = new URLSearchParams({ public_key: PUBLIC_KEY, path, limit: '1000' })
  const response = await fetch(`https://cloud-api.yandex.net/v1/disk/public/resources?${params}`)
  return response.json()
}

const importFile = async (url, title, filename) => {
  const response = await fetch(`${CMS_URL}/files/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, data: { title, filename_download: filename } }),
  })
  if (!response.ok) throw new Error(`File import failed for ${title}: ${response.status}`)
  return (await response.json()).data.id
}

const createProject = async ({ title, description, files, year = null }) => {
  const params = new URLSearchParams({ 'filter[title][_eq]': title, fields: 'id', limit: '1' })
  const existing = await fetch(`${CMS_URL}/items/projects?${params}`, { headers })
  if ((await existing.json()).data.length) {
    console.log(`Skip existing project: ${title}`)
    return
  }

  const reservation = await fetch(`${CMS_URL}/items/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, year, is_in_menu: true, content: `<p>${description}</p>` }),
  })
  if (!reservation.ok) throw new Error(`Project reservation failed for ${title}: ${await reservation.text()}`)
  const projectId = (await reservation.json()).data.id

  const fileIds = []
  for (const file of files) fileIds.push(await importFile(file.url, title, file.filename))
  if (!fileIds.length) {
    await fetch(`${CMS_URL}/items/projects/${projectId}`, { method: 'DELETE', headers })
    return
  }

  const response = await fetch(`${CMS_URL}/items/projects/${projectId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      preview: fileIds[0],
      gallery: fileIds.map((directus_files_id) => ({ directus_files_id })),
    }),
  })
  if (!response.ok) throw new Error(`Project creation failed for ${title}: ${await response.text()}`)
  console.log(`Created: ${title}`)
}

const cleanTitle = (value) => value.trim()
  .replace(/^Иркутстк/, 'Иркутск')
  .replace('ЖК ЖК', 'ЖК')
  .replace(/^Ялта ЖК Ро-Ялта$/, 'Ялта — ЖК Royalta')

const root = await getYandexResource('/ПРОЕКТЫ  ФОТО _ ПРЕЗЕНТАЦИИ _ СТР')
const folders = root._embedded.items.filter((item) => item.type === 'dir').sort((a, b) => a.name.localeCompare(b.name, 'ru'))

for (const folder of folders) {
  const node = await getYandexResource(folder.path)
  const images = node._embedded.items.filter((item) => item.mime_type?.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const documents = node._embedded.items.filter((item) => item.media_type === 'document')
  let files = images.map((image) => ({ url: image.file, filename: image.name }))

  if (!files.length && documents.length) {
    const preview = documents[0].sizes?.find((size) => size.name === 'XXXL')?.url
    if (preview) files = [{ url: preview, filename: `${folder.name.trim()}-preview.jpg` }]
  }
  if (!files.length) continue

  const title = cleanTitle(folder.name)
  await createProject({
    title,
    description: `Концепция архитектурного освещения объекта «${title}». Световое решение формирует цельный ночной образ, подчёркивает архитектуру и помогает сделать пространство выразительным и комфортным.`,
    files,
  })
}

const wixProjects = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./wix-projects.json', import.meta.url), 'utf8'))
for (const entry of wixProjects) {
  await createProject({
    ...entry,
    files: entry.images.map((url) => ({ url, filename: new URL(url).pathname.split('/').pop() })),
  })
}
