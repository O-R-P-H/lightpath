<template>
  <div class="page-wrapper">
    <!-- Кнопка возврата на страницу выбора вариантов -->
    <router-link to="/" class="back-btn">← К выбору вариантов</router-link>

    <!-- Здесь вызывается ваш уже написанный кастомный компонент -->
    <MyCustomHero />
  </div>
</template>

<script setup>
// Импортируйте ваш существующий компонент (укажите правильный путь к нему)
import MyCustomHero from '../components/Hero.vue'
</script>

<style scoped>
.page-wrapper {
  position: relative;
}

/* Кнопка "Назад" поверх вашего дизайна, чтобы заказчик мог переключаться */
.back-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 999;
  font-family: sans-serif;
  font-size: 0.9rem;
  text-decoration: none;
  color: inherit;
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
  background-color: transparent;
  mix-blend-mode: difference; /* Позволяет кнопке быть видимой на любом фоне */
  transition: opacity 0.2s;
}

.back-btn:hover {
  filter: invert(1);
}
</style>
