import DOMPurify from 'dompurify'

export const sanitizeHtml = (html) => DOMPurify.sanitize(html ?? '', {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['iframe', 'object', 'embed', 'style'],
})
