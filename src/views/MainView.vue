<template>
  <div class="main-page">
    <!-- Первый экран: Херо-блок -->
    <Header />

    <!-- Секция Обо мне (сюда скроллит кнопка "Подробнее") -->
    <section id="about" class="content-section">
      <div class="container">
        <h2>О студии</h2>
        <p>
          Мы создаем уникальные световые пространства на стыке архитектуры, инженерии и искусства.
          Каждый проект — это тонкая работа со светом, формой и атмосферой.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import Header from '../components/Header.vue'
</script>

<style scoped>
.main-page {
  background-color: #0e0e0f;
  color: #f1f1f0;
  font-family: 'Inter', sans-serif;
}

/* Стилизация контентной секции для примера */
.content-section {
  min-height: 100vh;
  padding: 8rem 2rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  border-top: 1px solid #3b3a39;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  margin-bottom: 2rem;
}

p {
  font-size: 1.5rem;
  line-height: 1.5;
  letter-spacing: -0.02em;
  opacity: 0.8;
}
</style>
