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

const imagePreloadCache = new Map()

const loadImage = (url) => new Promise((resolve, reject) => {
  if (!url || typeof Image === 'undefined') {
    reject(new Error('Image preload is unavailable'))
    return
  }

  const image = new Image()
  image.decoding = 'async'
  image.onload = () => resolve(url)
  image.onerror = () => reject(new Error(`Failed to preload image: ${url}`))
  image.src = url
})

export const preloadImage = (url, fallbackUrl = '') => {
  const cacheKey = `${url}|${fallbackUrl}`
  if (!imagePreloadCache.has(cacheKey)) {
    const request = loadImage(url)
      .catch(() => (fallbackUrl && fallbackUrl !== url ? loadImage(fallbackUrl) : Promise.reject()))
      .catch((error) => {
        imagePreloadCache.delete(cacheKey)
        throw error
      })
    imagePreloadCache.set(cacheKey, request)
  }

  return imagePreloadCache.get(cacheKey)
}
