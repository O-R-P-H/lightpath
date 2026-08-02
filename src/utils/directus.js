export const DIRECTUS_URL = 'https://lightcms.tsukawa.ru'

export const assetUrl = (file, options = {}) => {
  const id = typeof file === 'object' && file !== null ? file.id : file
  if (!id) return ''

  const url = new URL(`${DIRECTUS_URL}/assets/${id}`)
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}

export const resolveAssetId = (file) => {
  if (!file) return ''
  if (typeof file === 'string') return file
  return file.id || ''
}

export const resolveFile = (relation) => {
  if (!relation) return null
  const file = relation.directus_files_id ?? relation
  const id = resolveAssetId(file)
  if (!id) return null

  const type = typeof file === 'object' ? (file.type || '') : ''
  return {
    id,
    type,
    kind: type.startsWith('video/') ? 'video' : 'image',
    filename: typeof file === 'object' ? (file.filename_download || '') : '',
  }
}

export const fallbackToOriginalAsset = (event, file) => {
  const id = resolveAssetId(file)
  const element = event?.currentTarget
  if (!element || !id || element.dataset.fallbackApplied === 'true') return

  element.dataset.fallbackApplied = 'true'
  element.src = assetUrl(id)
}
