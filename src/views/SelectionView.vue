<template>
  <div class="selection-container">
    <main class="selection-box">
      <h1 class="title">Выберите вариант дизайна</h1>
      <div class="links-grid">
        <router-link to="/custom" class="nav-link">
          <span>Вариант 1</span>
          <span class="subtitle">Кастомный дизайн</span>
        </router-link>
        <router-link to="/reference" class="nav-link">
          <span>Вариант 2</span>
          <span class="subtitle">Референс (lisovskiy.work)</span>
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.selection-container {
  --color-front: #000;
  --color-back: #fff;
  --color-line: #000;

  background-color: var(--color-back);
  color: var(--color-front);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  font-family: 'Apfel Grotezk', sans-serif;
  letter-spacing: -0.04em;
}

@media (prefers-color-scheme: dark) {
  .selection-container {
    --color-front: #f1f1f0;
    --color-back: #0e0e0f;
    --color-line: #3b3a39;
  }
}

.selection-box {
  width: 100%;
  max-width: 800px;
  border: 1px solid var(--color-line);
  padding: 2rem;
}

.title {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  line-height: 1;
}

.links-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 760px) {
  .links-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.nav-link {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
  border: 1px solid var(--color-line);
  color: var(--color-front);
  text-decoration: none;
  transition: background-color 0.2s, transform 0.2s;
}

.nav-link:hover {
  background-color: var(--color-front);
  color: var(--color-back);
  transform: translateY(-2px);
}

.subtitle {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-top: 1rem;
}
</style>
