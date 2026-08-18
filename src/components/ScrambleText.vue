<template>
  <component
    :is="as"
    class="scramble-text"
    :class="{ 'is-scrambling': isScrambling, 'is-inline': isInline }"
    :data-scramble-text="isScrambling ? animatedText : undefined"
  >
    <span class="scramble-text__source">{{ sourceText }}</span>
  </component>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { scrambleTextValue } from '../utils/textScramble'

const props = defineProps({
  as: { type: String, default: 'span' },
  text: { type: [String, Number], default: '' },
  delay: { type: Number, default: 0 },
  duration: { type: Number, default: 760 },
  frameDuration: { type: Number, default: 42 },
  animationKey: { type: [String, Number], default: 0 },
})

const sourceText = computed(() => String(props.text ?? ''))
const animatedText = ref(sourceText.value)
const isScrambling = ref(false)
const isMounted = ref(false)
const isInline = computed(() => ['span', 'strong', 'em', 'small'].includes(props.as))
let stopAnimation = () => {}

const animate = () => {
  stopAnimation()
  animatedText.value = sourceText.value
  isScrambling.value = Boolean(sourceText.value)
  stopAnimation = scrambleTextValue(sourceText.value, (value) => {
    animatedText.value = value
  }, {
    delay: props.delay,
    duration: props.duration,
    frameDuration: props.frameDuration,
    onComplete: () => { isScrambling.value = false },
  })
}

watch([sourceText, () => props.animationKey], () => {
  if (isMounted.value) animate()
})

onMounted(() => {
  isMounted.value = true
  animate()
})

onUnmounted(() => {
  stopAnimation()
})
</script>

<style scoped>
.scramble-text {
  position: relative;
}

.scramble-text.is-inline {
  display: inline-block;
  vertical-align: top;
}

.scramble-text.is-scrambling {
  overflow: hidden;
}

.scramble-text.is-scrambling .scramble-text__source {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
}

.scramble-text.is-scrambling::after {
  position: absolute;
  inset: 0;
  display: block;
  box-sizing: border-box;
  overflow: hidden;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  text-align: inherit;
  text-transform: inherit;
  white-space: inherit;
  word-spacing: inherit;
  overflow-wrap: inherit;
  content: attr(data-scramble-text);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .scramble-text::after {
    display: none;
  }
}
</style>
