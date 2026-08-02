export const PRIMARY_CONTACTS = {
  telegram: {
    label: 'Telegram',
    value: '@Prism_top',
    href: 'https://t.me/Prism_top',
  },
  max: {
    label: 'MAX',
    value: '+7 936 227-52-70',
    href: 'https://max.ru/',
  },
  phone: {
    label: 'Телефон',
    value: '+7 936 227-52-70',
    href: 'tel:+79362275270',
  },
}

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '')

export const getContactLinks = (email = '') => {
  const links = [PRIMARY_CONTACTS.telegram, PRIMARY_CONTACTS.max]
  if (isValidEmail(email)) {
    links.push({ label: 'Email', value: email, href: `mailto:${email}` })
  }
  links.push(PRIMARY_CONTACTS.phone)
  return links
}
