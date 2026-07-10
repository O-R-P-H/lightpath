<template>
  <!-- RouterView будет автоматически рендерить SelectionView, CustomHeroView или ReferenceHeroView -->
  <RouterView />
</template>

<style>
/* Глобальные базовые стили, чтобы сбросить дефолтные отступы браузера */
html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: inherit;
}
</style>
