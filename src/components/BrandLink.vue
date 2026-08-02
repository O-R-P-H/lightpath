<template>
  <router-link to="/" class="brand-link" aria-label="На главную">
    <span>Студия светового дизайна</span>
    <span>Мацнева Николая</span>
  </router-link>
</template>

<style scoped>
.brand-link {
  display: inline-flex;
  flex-direction: column;
  width: max-content;
  max-width: 100%;
  color: inherit;
  text-decoration: none;
  line-height: 1;
}

.brand-link > span {
  display: block;
  white-space: nowrap;
  transition: opacity 0.25s ease;
}

@media (hover: hover) {
  .brand-link:hover > span {
    opacity: 0.58;
  }
}

@media (max-width: 480px) {
  .brand-link {
    font-size: clamp(15px, 4.5vw, 22px) !important;
  }
}
</style>
