<template>
  <div v-if="enabled" ref="spot" class="flashlight-spot" aria-hidden="true"></div>
  <div v-if="enabled" ref="cursor" class="flashlight-cursor" :class="{ 'is-active': isActive, 'is-link': isLink }" aria-hidden="true">
    <span ref="beam" class="flashlight-cursor__beam">
      <svg width="100" height="145" viewBox="0 0 100 145">
        <defs>
          <radialGradient id="flashlight-beam" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stop-color="#c8c7ff" stop-opacity=".34" />
            <stop offset="58%" stop-color="#7774df" stop-opacity=".11" />
            <stop offset="100%" stop-color="#7774df" stop-opacity="0" />
          </radialGradient>
        </defs>
        <polygon points="50,0 0,145 100,145" fill="url(#flashlight-beam)" />
      </svg>
    </span>
    <span class="flashlight-cursor__ring"></span>
    <span class="flashlight-cursor__dot"></span>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const cursor = ref(null)
const beam = ref(null)
const spot = ref(null)
const enabled = ref(false)
const isActive = ref(false)
const isLink = ref(false)

let targetX = 0
let targetY = 0
let smoothX = 0
let smoothY = 0
let lastX = 0
let lastY = 0
let targetAngle = 135
let smoothAngle = 135
let frame = 0

const isInteractive = (target) => target instanceof Element && Boolean(target.closest('a, button, [role="button"]'))

const handleMove = (event) => {
  const dx = event.clientX - lastX
  const dy = event.clientY - lastY
  if (Math.hypot(dx, dy) > 4) targetAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90
  lastX = targetX = event.clientX
  lastY = targetY = event.clientY
  if (spot.value) {
    spot.value.style.setProperty('--spot-x', `${targetX}px`)
    spot.value.style.setProperty('--spot-y', `${targetY}px`)
  }
}

const handleOver = (event) => { isLink.value = isInteractive(event.target) }
const handleDown = () => { isActive.value = true }
const handleUp = () => { isActive.value = false }

const animate = () => {
  smoothX += (targetX - smoothX) * 0.16
  smoothY += (targetY - smoothY) * 0.16
  const delta = ((targetAngle - smoothAngle + 540) % 360) - 180
  smoothAngle += delta * 0.12

  if (cursor.value) cursor.value.style.transform = `translate3d(${smoothX}px, ${smoothY}px, 0) translate(-50%, -50%)`
  if (beam.value) beam.value.style.transform = `rotate(${smoothAngle}deg)`
  frame = requestAnimationFrame(animate)
}

onMounted(() => {
  const finePointer = window.matchMedia('(pointer: fine)').matches
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  enabled.value = finePointer && !reducedMotion
  if (!enabled.value) return

  targetX = smoothX = lastX = window.innerWidth / 2
  targetY = smoothY = lastY = window.innerHeight / 2
  document.documentElement.classList.add('flashlight-active')
  window.addEventListener('pointermove', handleMove, { passive: true })
  window.addEventListener('pointerover', handleOver, { passive: true })
  window.addEventListener('pointerdown', handleDown, { passive: true })
  window.addEventListener('pointerup', handleUp, { passive: true })
  frame = requestAnimationFrame(animate)
})

onUnmounted(() => {
  document.documentElement.classList.remove('flashlight-active')
  window.removeEventListener('pointermove', handleMove)
  window.removeEventListener('pointerover', handleOver)
  window.removeEventListener('pointerdown', handleDown)
  window.removeEventListener('pointerup', handleUp)
  cancelAnimationFrame(frame)
})
</script>

<style scoped>
.flashlight-spot {
  position: fixed;
  inset: 0;
  z-index: 9990;
  pointer-events: none;
  background: radial-gradient(circle 310px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(124, 121, 230, 0.095), transparent 72%);
  mix-blend-mode: screen;
}

.flashlight-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10030;
  pointer-events: none;
  will-change: transform;
}

.flashlight-cursor__beam {
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.flashlight-cursor__beam svg {
  position: absolute;
  top: 0;
  left: -50px;
}

.flashlight-cursor__dot,
.flashlight-cursor__ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.flashlight-cursor__dot {
  width: 6px;
  height: 6px;
  background: #fff;
  box-shadow: 0 0 9px 2px rgba(244, 243, 255, 0.78), 0 0 24px 6px rgba(120, 117, 225, 0.38);
  transition: width 0.18s ease, height 0.18s ease, box-shadow 0.18s ease;
}

.flashlight-cursor__ring {
  width: 27px;
  height: 27px;
  border: 1px solid rgba(167, 165, 246, 0.46);
  transition: width 0.2s ease, height 0.2s ease, border-color 0.2s ease;
}

.flashlight-cursor.is-link .flashlight-cursor__ring {
  width: 43px;
  height: 43px;
  border-color: rgba(205, 204, 255, 0.75);
}

.flashlight-cursor.is-active .flashlight-cursor__dot {
  width: 11px;
  height: 11px;
  box-shadow: 0 0 22px 7px rgba(255, 255, 255, 0.54), 0 0 60px 20px rgba(111, 108, 220, 0.42);
}
</style>
