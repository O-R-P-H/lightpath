const clean = (value) => typeof value === 'string' ? value.trim() : ''

const withHttps = (value) => {
  const normalized = clean(value)
  if (!normalized) return ''
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(normalized)) return `https://${normalized}`
  return ''
}

const digitsOnly = (value) => clean(value).replace(/\D/g, '')

const formatPhone = (value) => {
  const digits = digitsOnly(value)
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }
  return clean(value)
}

const buildPhone = (value) => {
  const digits = digitsOnly(value)
  if (digits.length < 7 || digits.length > 15) return null

  const internationalDigits = digits.length === 11 && digits.startsWith('8')
    ? `7${digits.slice(1)}`
    : digits

  return {
    type: 'phone',
    label: 'Телефон',
    value: formatPhone(internationalDigits),
    href: `tel:+${internationalDigits}`,
    external: false,
  }
}

const buildEmail = (value) => {
  const email = clean(value)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null

  return {
    type: 'email',
    label: 'Почта',
    value: email,
    href: `mailto:${email}`,
    external: false,
  }
}

const buildTelegram = (value) => {
  const input = clean(value)
  if (!input) return null

  const username = input.replace(/^@/, '')
  const href = /^[a-z\d_]{5,}$/i.test(username)
    ? `https://t.me/${username}`
    : withHttps(input)

  if (!href) return null

  const pathUsername = href.match(/t\.me\/([^/?#]+)/i)?.[1]
  return {
    type: 'telegram',
    label: 'Telegram',
    value: pathUsername ? `@${pathUsername}` : 'Открыть чат',
    href,
    external: true,
  }
}

const buildMax = (value) => {
  const href = withHttps(value)
  if (!href) return null

  let displayValue = 'Открыть MAX'
  try {
    const url = new URL(href)
    const handle = url.pathname.split('/').filter(Boolean).at(-1)
    if (handle) displayValue = `@${handle.replace(/^@/, '')}`
  } catch {
    return null
  }

  return {
    type: 'max',
    label: 'MAX',
    value: displayValue,
    href,
    external: true,
  }
}

const buildWhatsApp = (value) => {
  const input = clean(value)
  if (!input) return null

  const href = withHttps(input) || (() => {
    const digits = digitsOnly(input)
    if (digits.length < 7 || digits.length > 15) return ''
    const internationalDigits = digits.length === 11 && digits.startsWith('8')
      ? `7${digits.slice(1)}`
      : digits
    return `https://wa.me/${internationalDigits}`
  })()

  if (!href) return null

  const contactDigits = href.match(/wa\.me\/(\d+)/i)?.[1]
  return {
    type: 'whatsapp',
    label: 'WhatsApp',
    value: contactDigits ? formatPhone(contactDigits) : 'Открыть чат',
    href,
    external: true,
  }
}

const CONTACT_BUILDERS = [
  ['phone', buildPhone],
  ['email', buildEmail],
  ['telegram_url', buildTelegram],
  ['max_url', buildMax],
  ['whatsapp_url', buildWhatsApp],
]

export const getContactLinks = (contacts = {}) => CONTACT_BUILDERS
  .map(([field, builder]) => builder(contacts?.[field]))
  .filter(Boolean)
