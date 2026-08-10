<template>
  <RouterView />
  <FlashlightCursor />
</template>

<script setup>
import FlashlightCursor from './components/FlashlightCursor.vue'
</script>

<style>
@font-face {
  font-family: 'Inter';
  src: url('/fonts/ApfelGrotezk-Regular.woff') format('woff');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

:root {
  --color-front: #f1f1f0;
  --color-back: #090a16;
  --color-line: rgba(180, 182, 224, 0.22);
  --site-background:
    radial-gradient(circle at 78% 8%, rgba(87, 86, 174, 0.24), transparent 34%),
    radial-gradient(circle at 16% 92%, rgba(36, 62, 117, 0.18), transparent 40%),
    linear-gradient(138deg, #10142c 0%, #090a16 46%, #171126 100%);
}

html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  min-height: 100%;
  background: #090a16;
  color: var(--color-front);
  font-family: 'Inter', Arial, sans-serif;
}

body {
  background-image: var(--site-background);
  background-attachment: fixed;
}

#app {
  min-height: 100vh;
}

*, *::before, *::after {
  box-sizing: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

button:focus-visible,
a:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 4px;
}

@media (pointer: fine) and (prefers-reduced-motion: no-preference) {
  html.flashlight-active,
  html.flashlight-active a,
  html.flashlight-active button,
  html.flashlight-active [role='button'] {
    cursor: none !important;
  }
}

@media (max-width: 759px) {
  body {
    background-attachment: scroll;
  }
}
</style>
