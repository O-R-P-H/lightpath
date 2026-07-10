<template>
  <div class="page-wrapper">
    <!-- Навигационная ссылка "Назад" в стиле минимализма -->
    <router-link to="/" class="back-btn">← Выбор дизайна</router-link>
    <HeroReference />
  </div>
</template>

<script setup>
import HeroReference from '../components/HeroReference.vue'
</script>

<style scoped>
.page-wrapper {
  position: relative;
}

.back-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  font-family: 'Apfel Grotezk', sans-serif;
  font-size: 0.9rem;
  text-decoration: none;
  color: inherit;
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
  background-color: transparent;
  mix-blend-mode: difference;
}

.back-btn:hover {
  filter: invert(1);
}
</style>
