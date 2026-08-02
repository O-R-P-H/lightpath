<template>
  <svg v-if="type === 'Telegram'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 4 3.8 10.6c-1.2.5-1.2 1.2-.2 1.5l4.4 1.4 1.7 5.2c.2.7.1 1 .8 1 .5 0 .8-.2 1-.4l2.2-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8L22.5 6c.3-1.1-.4-1.6-1.5-1.2Zm-2.2 3.1-8 7.2-.3 3.4-1.1-3.8 8.6-7.8c.4-.3.7-.2.8 0Z"/>
  </svg>
  <svg v-else-if="type === 'MAX'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.2h3.2l4.8 6.1 4.8-6.1H20v13.6h-3.4V10l-4.6 5.8L7.4 10v8.8H4V5.2Z"/>
  </svg>
  <svg v-else-if="type === 'Email'" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 5h18v14H3V5Zm2 2v.3l7 5.1 7-5.1V7H5Zm14 10V9.8l-7 5.1-7-5.1V17h14Z"/>
  </svg>
  <svg v-else viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.5 3h3l1.2 4.6-2 1.7c1.2 2.5 3.4 4.7 5.9 5.9l1.8-2 4.6 1.3v3c0 1.9-1.6 3.5-3.5 3.5C9.5 21 3 14.5 3 6.5 3 4.6 4.6 3 6.5 3Zm.3 2C5.8 5 5 5.7 5 6.5 5 13.4 10.6 19 17.5 19c.8 0 1.5-.8 1.5-1.7V16l-2-.5-1.8 2a14 14 0 0 1-9-9l2.2-1.8L8 5H6.8Z"/>
  </svg>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
</style>
