<template>
  <button type="button" class="order-trigger" @click="openModal">
    <span>Заказать проект</span>
  </button>

  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title" @click.self="closeModal">
        <div class="contact-modal__panel">
          <div class="contact-modal__header">
            <h2 id="contact-modal-title">Обсудить проект</h2>
            <button ref="closeButton" type="button" class="contact-modal__close" aria-label="Закрыть" @click="closeModal">×</button>
          </div>

          <p class="contact-modal__lead">Выберите удобный способ связи — Николай ответит и уточнит детали проекта.</p>

          <ul v-if="contacts.length" class="contact-modal__links">
            <li v-for="contact in contacts" :key="contact.type">
              <a
                :href="contact.href"
                :target="contact.external ? '_blank' : undefined"
                :rel="contact.external ? 'noopener noreferrer' : undefined"
              >
                <ContactIcon :type="contact.type" />
                <span class="contact-modal__label">{{ contact.label }}</span>
                <span class="contact-modal__value">{{ contact.value }}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>

          <p v-else class="contact-modal__empty">
            {{ contactsLoading ? 'Загружаем контакты…' : 'Контакты временно недоступны.' }}
          </p>

          <p v-if="hasMaxContact" class="contact-modal__note">Ссылка откроется в мессенджере MAX.</p>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import ContactIcon from './ContactIcon.vue'
import { getContactLinks } from '../config/contacts'
import { DIRECTUS_URL } from '../utils/directus'

const isOpen = ref(false)
const closeButton = ref(null)
const contacts = ref([])
const contactsLoading = ref(false)
const contactsLoaded = ref(false)
const hasMaxContact = computed(() => contacts.value.some((contact) => contact.type === 'max'))
let previousOverflow = ''

const fetchContacts = async () => {
  if (contactsLoaded.value || contactsLoading.value) return
  contactsLoading.value = true

  try {
    const fields = 'phone,email,telegram_url,max_url,whatsapp_url'
    const response = await fetch(`${DIRECTUS_URL}/items/contacts?fields=${fields}`)
    if (!response.ok) throw new Error(`CMS returned ${response.status}`)
    const { data } = await response.json()
    contacts.value = getContactLinks(data)
    contactsLoaded.value = true
  } catch (error) {
    console.error('Ошибка получения контактов для формы заказа:', error)
  } finally {
    contactsLoading.value = false
  }
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') closeModal()
}

const openModal = async () => {
  isOpen.value = true
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
  fetchContacts()
  await nextTick()
  closeButton.value?.focus()
}

const closeModal = () => {
  isOpen.value = false
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', handleKeydown)
}

onUnmounted(closeModal)
</script>

<style scoped>
.order-trigger {
  appearance: none;
  border: 1px solid color-mix(in srgb, var(--color-front, #f1f1f0) 70%, transparent);
  background: rgba(9, 10, 22, 0.34);
  color: var(--color-front, #f1f1f0);
  padding: 0.34rem 0.54rem;
  font: inherit;
  font-size: clamp(15px, 0.92vw, 34px);
  line-height: 1;
  letter-spacing: 0;
  backdrop-filter: blur(12px);
  transition: color 0.25s ease, background 0.25s ease, border-color 0.25s ease;
}

@media (hover: hover) {
  .order-trigger:hover {
    color: #090a16;
    background: #f1f1f0;
    border-color: #f1f1f0;
  }
}

.contact-modal {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: grid;
  place-items: center;
  padding: clamp(16px, 3vw, 56px);
  background: rgba(2, 3, 10, 0.68);
  backdrop-filter: blur(18px);
}

.contact-modal__panel {
  width: min(clamp(720px, 44vw, 1200px), 100%);
  border: 1px solid rgba(241, 241, 240, 0.28);
  background:
    radial-gradient(circle at 82% 18%, rgba(104, 103, 198, 0.22), transparent 42%),
    linear-gradient(145deg, rgba(20, 24, 52, 0.98), rgba(8, 9, 19, 0.98));
  color: #f1f1f0;
  letter-spacing: 0;
  line-height: normal;
  padding: clamp(22px, 3vw, 86px);
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.46);
}

.contact-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.contact-modal__header h2 {
  margin: 0;
  font-size: clamp(34px, 4vw, 108px);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 0.95;
}

.contact-modal__close {
  width: clamp(42px, 2.6vw, 70px);
  height: clamp(42px, 2.6vw, 70px);
  flex: 0 0 auto;
  border: 1px solid rgba(241, 241, 240, 0.35);
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: clamp(28px, 1.7vw, 46px);
  line-height: 1;
}

.contact-modal__lead,
.contact-modal__note,
.contact-modal__empty {
  max-width: 38ch;
  margin: clamp(24px, 1.8vw, 48px) 0;
  font-size: clamp(16px, 1.05vw, 30px);
  line-height: 1.45;
  opacity: 0.76;
}

.contact-modal__links {
  margin: clamp(30px, 2vw, 54px) 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(241, 241, 240, 0.18);
}

.contact-modal__links a {
  display: grid;
  grid-template-columns: auto minmax(90px, 0.6fr) 1fr auto;
  align-items: center;
  gap: clamp(12px, 1vw, 28px);
  padding: clamp(18px, 1.3vw, 36px) 0;
  border-bottom: 1px solid rgba(241, 241, 240, 0.18);
  color: inherit;
  text-decoration: none;
  font-size: clamp(17px, 1.15vw, 34px);
}

.contact-modal__links svg {
  font-size: 1.2em;
}

.contact-modal__value {
  opacity: 0.62;
  text-align: right;
}

.contact-modal__note {
  margin-bottom: 0;
  font-size: clamp(13px, 0.72vw, 22px);
}

.contact-modal__empty {
  padding: clamp(24px, 2vw, 52px) 0;
  border-top: 1px solid rgba(241, 241, 240, 0.18);
  border-bottom: 1px solid rgba(241, 241, 240, 0.18);
  opacity: 0.62;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 560px) {
  .order-trigger {
    min-height: 44px;
    padding: 11px 16px;
    font-size: 15px;
  }

  .contact-modal {
    align-items: end;
    padding: 12px;
  }

  .contact-modal__panel {
    width: 100%;
    max-height: calc(100svh - 24px);
    padding: 20px;
    overflow-y: auto;
    border-radius: 18px 18px 6px 6px;
    overscroll-behavior: contain;
  }

  .contact-modal__header {
    gap: 16px;
  }

  .contact-modal__header h2 {
    font-size: clamp(30px, 9vw, 38px);
  }

  .contact-modal__close {
    width: 44px;
    height: 44px;
    font-size: 28px;
  }

  .contact-modal__lead,
  .contact-modal__note,
  .contact-modal__empty {
    margin: 18px 0;
    font-size: 15px;
  }

  .contact-modal__links {
    margin-top: 20px;
  }

  .contact-modal__links a {
    grid-template-columns: auto 1fr auto;
    min-height: 56px;
    padding: 12px 0;
    font-size: 16px;
  }

  .contact-modal__value {
    display: none;
  }
}
</style>
