<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { Text } from 'troika-three-text'

const heroContainer = ref(null)
const canvas = ref(null)

const textLine1 = ref('')
const textLine2 = ref('')

// Ссылки на DOM-элементы текста для пиксельно-точного проецирования
const line1Ref = ref(null)
const line2Ref = ref(null)

// Настройки локализации и глобального освещения
const currentLanguage = ref('EN')
const isGlobalLightOn = ref(false)

// Интерактивный список тегов интерфейса
const tags = ref([
  { original: 'Concept', current: 'Concept' },
  { original: 'Light', current: 'Light' },
  { original: 'Design', current: 'Design' },
  { original: 'Architecture', current: 'Architecture' },
  { original: 'Atmosphere', current: 'Atmosphere' },
  { original: 'Installation', current: 'Installation' },
  { original: 'Innovation', current: 'Innovation' },
  { original: 'Art', current: 'Art' },
  { original: 'Impact', current: 'Impact' }
])

// Глобальные переменные сцены
let scene, camera, renderer, spotlight, lightTarget, dustParticles
let projectorBody, projectorAssembly
let beamMesh, beamShaderMat
let textMesh1, textMesh2 // Невидимые 3D-дубликаты для генерации теней
let dimSun, ambientLight
let animationFrameId
let startTime = performance.now()
let isControlLocked = true // Блокировка прожектора на старте
let createdBlobUrl = null // Хранение ссылки на временный Blob URL для очистки памяти

let targetIntensity = 20
let currentIntensity = 0

let hasMouseMoved = false
const initialTargetX = -2.2
const initialTargetY = 0.0
const targetCameraPos = new THREE.Vector3(0, 0, 9.5)

// Вектор цели для плавного перехода луча к курсору
const mouseTarget = new THREE.Vector3(initialTargetX, initialTargetY, -2.0)

// Плавный латинский/кириллический Scramble-эффект
const scramble = (targetText, reactiveRef, delay = 100, duration = 1000) => {
  let start = null

  setTimeout(() => {
    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = timestamp - start
      const fraction = Math.min(progress / duration, 1)

      let result = ''
      for (let i = 0; i < targetText.length; i++) {
        const char = targetText[i]
        if (char === ' ') {
          result += ' '
          continue
        }

        const revealThreshold = (i / targetText.length) * 0.8
        if (fraction > revealThreshold) {
          result += char
        } else {
          const randomSource = targetText.replace(/\s/g, '')
          result += randomSource[Math.floor(Math.random() * randomSource.length)]
        }
      }

      if (typeof reactiveRef === 'object' && 'value' in reactiveRef) {
        reactiveRef.value = result
      } else if (typeof reactiveRef === 'function') {
        reactiveRef(result)
      }

      if (fraction < 1) {
        requestAnimationFrame(step)
      } else {
        if (typeof reactiveRef === 'object' && 'value' in reactiveRef) {
          reactiveRef.value = targetText
        } else if (typeof reactiveRef === 'function') {
          reactiveRef(targetText)
        }
      }
    }
    requestAnimationFrame(step)
  }, delay)
}

// Переключение языков (блокировка по свету убрана)
const toggleLanguage = () => {
  if (isControlLocked) return

  currentLanguage.value = currentLanguage.value === 'EN' ? 'RU' : 'EN'

  if (currentLanguage.value === 'EN') {
    scramble('The lighting studio of', textLine1, 100, 1200)
    scramble('Nikolay Matsnev', textLine2, 400, 1500)
    tags.value = [
      { original: 'Concept', current: 'Concept' },
      { original: 'Light', current: 'Light' },
      { original: 'Design', current: 'Design' },
      { original: 'Architecture', current: 'Architecture' },
      { original: 'Atmosphere', current: 'Atmosphere' },
      { original: 'Installation', current: 'Installation' },
      { original: 'Innovation', current: 'Innovation' },
      { original: 'Art', current: 'Art' },
      { original: 'Impact', current: 'Impact' }
    ]
  } else {
    scramble('Световая студия', textLine1, 100, 1200)
    scramble('Николая Мацнева', textLine2, 400, 1500)
    tags.value = [
      { original: 'Концепция', current: 'Концепция' },
      { original: 'Свет', current: 'Свет' },
      { original: 'Дизайн', current: 'Дизайн' },
      { original: 'Архитектура', current: 'Архитектура' },
      { original: 'Атмосфера', current: 'Атмосфера' },
      { original: 'Инсталляция', current: 'Инсталляция' },
      { original: 'Инновации', current: 'Инновации' },
      { original: 'Искусство', current: 'Искусство' },
      { original: 'Влияние', current: 'Влияние' }
    ]
  }
}

// Построение невидимого 3D-текста
const update3DTextGeometry = (text, mesh, size) => {
  if (!mesh) return

  mesh.text = text
  mesh.fontSize = size
  mesh.sync(() => {
    // Отключаем запись цвета в буфер кадра (делает текст невидимым),
    // но сохраняем запись в буфер глубины для генерации теней
    if (mesh.material) {
      mesh.material.colorWrite = false
      mesh.material.depthWrite = true
    }
    syncTextPositionAndScale()
  })
}

// Математический пересчет координат DOM-элементов в 3D пространство WebGL
const syncTextPositionAndScale = () => {
  if (!camera || !renderer || !textMesh1 || !textMesh2 || !line1Ref.value || !line2Ref.value) return

  const width = heroContainer.value.clientWidth
  const height = heroContainer.value.clientHeight

  const rect1 = line1Ref.value.getBoundingClientRect()
  const rect2 = line2Ref.value.getBoundingClientRect()

  const camZ = camera.position.z
  const textZ = -1.8
  const dist = camZ - textZ
  const vFov = (camera.fov * Math.PI) / 180
  const worldHeight = 2 * Math.tan(vFov / 2) * dist
  const worldWidth = worldHeight * camera.aspect

  const mapRectToMesh = (rect, mesh) => {
    if (rect.width === 0 || rect.height === 0) return

    const pixelX = rect.left + rect.width / 2
    const pixelY = rect.top + rect.height / 2

    const ndcX = (pixelX / width) * 2 - 1
    const ndcY = -(pixelY / height) * 2 + 1

    const worldX = ndcX * (worldWidth / 2)
    const worldY = ndcY * (worldHeight / 2)

    mesh.position.set(worldX, worldY, textZ)

    const meshWidth3D = (rect.width / width) * worldWidth
    const meshHeight3D = (rect.height / height) * worldHeight

    if (mesh.geometry) {
      mesh.geometry.computeBoundingBox()
      const bbox = mesh.geometry.boundingBox
      if (bbox) {
        const geomWidth = bbox.max.x - bbox.min.x
        const geomHeight = bbox.max.y - bbox.min.y

        if (geomWidth > 0 && geomHeight > 0) {
          mesh.scale.set(meshWidth3D / geomWidth, meshHeight3D / geomHeight, 1)
        }
      }
    }
  }

  mapRectToMesh(rect1, textMesh1)
  mapRectToMesh(rect2, textMesh2)
}

const createBeamTexture = () => {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 16
  canvasElement.height = 256
  const ctx = canvasElement.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.45)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 16, 256)
  return new THREE.CanvasTexture(canvasElement)
}

const initThree = () => {
  if (!canvas.value || !heroContainer.value) return

  const width = heroContainer.value.clientWidth
  const height = heroContainer.value.clientHeight

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
  camera.position.copy(targetCameraPos)

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // Стенка на заднем плане
  const wallGeo = new THREE.PlaneGeometry(35, 20)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d10,
    roughness: 0.8,
    metalness: 0.1
  })
  const wall = new THREE.Mesh(wallGeo, wallMat)
  wall.position.z = -4.0
  wall.receiveShadow = true
  scene.add(wall)

  // Темный пол
  const floorGeo = new THREE.PlaneGeometry(35, 12)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    roughness: 0.9,
    metalness: 0.1
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.2
  floor.position.z = -1
  floor.receiveShadow = true
  scene.add(floor)

  dimSun = new THREE.DirectionalLight(0xe2dcd2, 0.42)
  dimSun.position.set(0, 4.0, 15.0)
  scene.add(dimSun)

  ambientLight = new THREE.AmbientLight(0xffffff, 0.04)
  scene.add(ambientLight)

  // Конструкция прожектора
  projectorAssembly = new THREE.Group()
  projectorAssembly.position.set(3.0, 1.9, 3.0)
  scene.add(projectorAssembly)

  const rodLength = 3.5
  const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, rodLength, 16)
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.85, roughness: 0.15 })

  const rod = new THREE.Mesh(rodGeo, metalMat)
  rod.position.y = rodLength / 2
  projectorAssembly.add(rod)

  const yokeGeo = new THREE.TorusGeometry(0.22, 0.025, 8, 24, Math.PI)
  const yoke = new THREE.Mesh(yokeGeo, metalMat)
  yoke.rotation.x = Math.PI / 2
  yoke.position.y = 0.03
  projectorAssembly.add(yoke)

  projectorBody = new THREE.Group()
  projectorAssembly.add(projectorBody)

  const bodyGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 18)
  const body = new THREE.Mesh(bodyGeo, metalMat)
  body.rotation.x = Math.PI / 2
  projectorBody.add(body)

  const lensRingGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 18)
  const lensRing = new THREE.Mesh(lensRingGeo, metalMat)
  lensRing.rotation.x = Math.PI / 2
  lensRing.position.z = -0.35
  projectorBody.add(lensRing)

  const lensGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.01, 18)
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff8ee })
  const lens = new THREE.Mesh(lensGeo, lensMat)
  lens.rotation.x = Math.PI / 2
  lens.position.z = -0.39
  projectorBody.add(lens)

  // SpotLight
  spotlight = new THREE.SpotLight(0xfff8ee, 0, 18, Math.PI / 6.5, 0.5, 0.0)
  spotlight.castShadow = true
  spotlight.shadow.mapSize.width = 2048
  spotlight.shadow.mapSize.height = 2048
  spotlight.shadow.camera.near = 1.0
  spotlight.shadow.camera.far = 15
  spotlight.shadow.bias = -0.001
  spotlight.shadow.radius = 12.0
  projectorBody.add(spotlight)

  lightTarget = new THREE.Object3D()
  lightTarget.position.set(initialTargetX, initialTargetY, -2.0)
  scene.add(lightTarget)
  spotlight.target = lightTarget

  // Объемный конус луча
  const beamGeo = new THREE.ConeGeometry(2.1, 11, 128, 1, true)
  beamGeo.translate(0, -5.5, 0)

  const beamTex = createBeamTexture()

  beamShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0xfff8ee) },
      opacity: { value: 0.0 },
      beamTexture: { value: beamTex }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float opacity;
      uniform sampler2D beamTexture;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        float edgeFade = pow(1.0 - abs(vNormal.z), 3.0);
        vec4 texColor = texture2D(beamTexture, vUv);
        gl_FragColor = vec4(glowColor, edgeFade * texColor.r * opacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  })

  beamMesh = new THREE.Mesh(beamGeo, beamShaderMat)
  beamMesh.rotation.x = -Math.PI / 2
  beamMesh.position.z = -0.35
  projectorBody.add(beamMesh)

  // --- ИНИЦИАЛИЗАЦИЯ TROIKA-THREE-TEXT ---
  textMesh1 = new Text()
  textMesh1.anchorX = 'center'
  textMesh1.anchorY = 'middle'
  textMesh1.castShadow = true
  textMesh1.receiveShadow = true
  scene.add(textMesh1)

  textMesh2 = new Text()
  textMesh2.anchorX = 'center'
  textMesh2.anchorY = 'middle'
  textMesh2.castShadow = true
  textMesh2.receiveShadow = true
  scene.add(textMesh2)

  createDustParticles()
  adjustLayout()
}

const createDustParticles = () => {
  const particleCount = 80
  const pGeometry = new THREE.BufferGeometry()
  const pPositions = new Float32Array(particleCount * 3)
  const pVelocities = []

  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 16
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 10
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 5

    pVelocities.push({
      x: (Math.random() - 0.5) * 0.001,
      y: (Math.random() + 0.1) * 0.0015,
      z: (Math.random() - 0.5) * 0.001
    })
  }

  pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
  const pMaterial = new THREE.PointsMaterial({
    color: 0xfff6e3,
    size: 0.032,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  })

  dustParticles = new THREE.Points(pGeometry, pMaterial)
  scene.add(dustParticles)
  dustParticles.userData = { velocities: pVelocities }
}

const onMouseMove = (event) => {
  if (isControlLocked) return
  if (!heroContainer.value || !lightTarget) return

  if (!hasMouseMoved) {
    hasMouseMoved = true
  }

  const rect = heroContainer.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  mouseTarget.set(x * 10, y * 6.5, -2.0)
}

const onMouseLeave = () => {
  if (!lightTarget) return
  hasMouseMoved = false
}

// Отслеживание изменений текста
watch(textLine1, (newText) => {
  update3DTextGeometry(newText, textMesh1, 0.35)
})

watch(textLine2, (newText) => {
  update3DTextGeometry(newText, textMesh2, 0.85)
})

const adjustLayout = () => {
  if (!heroContainer.value || !camera || !renderer) return
  const width = heroContainer.value.clientWidth
  const height = heroContainer.value.clientHeight

  camera.aspect = width / height

  if (width / height < 1) {
    targetCameraPos.z = 11.5
  } else {
    targetCameraPos.z = 9.5
  }

  camera.updateProjectionMatrix()
  renderer.setSize(width, height)

  nextTick(syncTextPositionAndScale)
}

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)

  if (isGlobalLightOn.value) {
    dimSun.intensity += (20.0 - dimSun.intensity) * 0.05
    ambientLight.intensity += (10.0 - ambientLight.intensity) * 0.05

    spotlight.intensity += (0.0 - spotlight.intensity) * 0.08
    beamShaderMat.uniforms.opacity.value += (0.0 - beamShaderMat.uniforms.opacity.value) * 0.08

    lightTarget.position.x += (3.0 - lightTarget.position.x) * 0.05
    lightTarget.position.y += (-5.0 - lightTarget.position.y) * 0.05
    lightTarget.position.z += (3.0 - lightTarget.position.z) * 0.05

  } else {
    dimSun.intensity += (0.2 - dimSun.intensity) * 0.05
    ambientLight.intensity += (0.04 - ambientLight.intensity) * 0.05

    if (currentIntensity < targetIntensity) {
      currentIntensity += (targetIntensity - currentIntensity) * 0.03
      spotlight.intensity = currentIntensity
      beamShaderMat.uniforms.opacity.value = (currentIntensity / targetIntensity) * 0.06
    } else {
      spotlight.intensity = targetIntensity
      beamShaderMat.uniforms.opacity.value = 0.06
    }

    const targetX = hasMouseMoved ? mouseTarget.x : initialTargetX
    const targetY = hasMouseMoved ? mouseTarget.y : initialTargetY
    const targetZ = hasMouseMoved ? mouseTarget.z : -2.0

    lightTarget.position.x += (targetX - lightTarget.position.x) * 0.05
    lightTarget.position.y += (targetY - lightTarget.position.y) * 0.05
    lightTarget.position.z += (targetZ - lightTarget.position.z) * 0.05
  }

  camera.position.x += (targetCameraPos.x - camera.position.x) * 0.05
  camera.position.y += (targetCameraPos.y - camera.position.y) * 0.05
  camera.lookAt(0, 0, -1)

  if (projectorBody && lightTarget) {
    projectorBody.lookAt(lightTarget.position)
  }

  syncTextPositionAndScale()

  if (dustParticles) {
    const positions = dustParticles.geometry.attributes.position.array
    const velocities = dustParticles.userData.velocities

    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3] += velocities[i].x
      positions[i * 3 + 1] += velocities[i].y
      positions[i * 3 + 2] * velocities[i].z

      if (positions[i * 3 + 1] > 5) {
        positions[i * 3 + 1] = -5
        positions[i * 3] = (Math.random() - 0.5) * 16
      }
    }
    dustParticles.geometry.attributes.position.needsUpdate = true
  }

  renderer.render(scene, camera)
}

// Автоматический перебор имен файлов в папке public для точного соответствия регистру
const findAndLoadLocalFont = async () => {
  const possibleNames = [
    '/Montserrat-Regular.ttf', // Точное имя вашего файла
    '/montserrat-regular.ttf',
    '/Montserrat_Regular.ttf',
    '/montserrat_regular.ttf',
    '/Montserrat.ttf',
    '/montserrat.ttf'
  ]

  for (const fontPath of possibleNames) {
    try {
      const response = await fetch(fontPath)
      if (response.ok) {
        const buffer = await response.arrayBuffer()
        console.log(`Successfully loaded local font: ${fontPath}`)
        return buffer
      }
    } catch (e) {
      // Игнорируем и пробуем следующий путь
    }
  }
  throw new Error('Montserrat font file was not found in your public/ folder.')
}

onMounted(() => {
  initThree()
  animate()

  findAndLoadLocalFont()
      .then(arrayBuffer => {
        // Конвертируем ArrayBuffer во временный Blob URL, который безошибочно считывается воркером
        const blob = new Blob([arrayBuffer], { type: 'font/ttf' })
        createdBlobUrl = URL.createObjectURL(blob)

        textMesh1.font = createdBlobUrl
        textMesh2.font = createdBlobUrl

        // Инициируем сборку геометрии
        update3DTextGeometry(textLine1.value, textMesh1, 0.35)
        update3DTextGeometry(textLine2.value, textMesh2, 0.85)

        // Запуск Scramble-эффектов
        scramble('The lighting studio of', textLine1, 100, 1800)
        scramble('Nikolay Matsnev', textLine2, 500, 2200)
      })
      .catch(err => {
        console.error("Font loading sequence failed, trying CDN fallback...", err)
        // Внешний резервный CDN-путь
        const fallbackUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@master/ofl/montserrat/Montserrat-Regular.ttf'
        textMesh1.font = fallbackUrl
        textMesh2.font = fallbackUrl

        update3DTextGeometry(textLine1.value, textMesh1, 0.35)
        update3DTextGeometry(textLine2.value, textMesh2, 0.85)

        scramble('The lighting studio of', textLine1, 100, 1800)
        scramble('Nikolay Matsnev', textLine2, 500, 2200)
      })

  setTimeout(() => {
    isControlLocked = false
  }, 2500)

  window.addEventListener('resize', adjustLayout)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', adjustLayout)

  // Очистка Blob-адреса из памяти браузера
  if (createdBlobUrl) {
    URL.revokeObjectURL(createdBlobUrl)
  }

  // Безопасное удаление объектов Troika
  if (textMesh1 && typeof textMesh1.dispose === 'function') textMesh1.dispose()
  if (textMesh2 && typeof textMesh2.dispose === 'function') textMesh2.dispose()

  if (renderer) renderer.dispose()
  scene.traverse((object) => {
    if (object.isMesh || object.isPoints) {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose())
        } else {
          object.material.dispose()
        }
      }
    }
  })
})
</script>

<template>
  <header
      ref="heroContainer"
      class="hero-header"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
  >
    <div class="canvas-background">
      <canvas ref="canvas"></canvas>
    </div>

    <div class="hero-content">
      <nav class="hero-nav">
        <div class="nav-controls">
          <button class="control-btn lang-btn select-none" @click="toggleLanguage">
            {{ currentLanguage }}
          </button>
          <button class="control-btn light-btn select-none" @click="isGlobalLightOn = !isGlobalLightOn">
            {{ isGlobalLightOn ? (currentLanguage === 'EN' ? 'LIGHT: ON' : 'СВЕТ: ВКЛ') : (currentLanguage === 'EN' ? 'LIGHT: OFF' : 'СВЕТ: ВЫКЛ') }}
          </button>
        </div>

        <div class="nav-links" @mouseenter="hasMouseMoved = false">
          <a href="#about" class="nav-item">{{ currentLanguage === 'EN' ? 'About' : 'О нас' }}</a>
          <a href="#portfolio" class="nav-item">{{ currentLanguage === 'EN' ? 'Portfolio' : 'Портфолио' }}</a>
          <a href="#contact" class="nav-item">{{ currentLanguage === 'EN' ? 'Contact' : 'Контакты' }}</a>
        </div>
      </nav>

      <div class="hero-title-group">
        <h1 class="hero-title">
          <span class="scramble-container select-none">
            <span ref="line1Ref" class="scramble-text line-title">{{ textLine1 }}</span>
          </span>
          <br />
          <span class="scramble-container select-none">
            <span ref="line2Ref" class="scramble-text client-name">{{ textLine2 }}</span>
          </span>
        </h1>
      </div>

      <ul class="hero-tags">
        <li
            v-for="(tag, idx) in tags"
            :key="idx"
            :style="`animation-delay: ${0.7 + idx * 0.05}s;`"
        >
          {{ tag.original }}
        </li>
      </ul>
    </div>
  </header>
</template>

<style scoped>
@font-face {
  font-family: 'ApfelGrotezk-Regular';
  src: url('./ApfelGrotezk-Regular.BWvmwAfX.woff2') format('woff2'),
  url('./ApfelGrotezk-Regular.Cf-knoBG.woff') format('woff');
  font-weight: normal;
  font-style: normal;
}

.hero-header {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #0e0e0f;
  overflow: hidden;
  box-sizing: border-box;
}

.canvas-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.canvas-background canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.hero-content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  padding: 4.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hero-nav {
  pointer-events: auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'ApfelGrotezk-Regular', sans-serif;
  color: #f1f1f0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.9rem;
}

.nav-controls {
  display: flex;
  gap: 1.5rem;
}

.control-btn {
  background: none;
  border: 1px solid rgba(241, 241, 240, 0.2);
  color: #f1f1f0;
  font-family: 'ApfelGrotezk-Regular', sans-serif;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.4rem 1.1rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.control-btn:hover {
  color: #ffdfa4;
  border-color: rgba(255, 223, 164, 0.45);
  box-shadow: 0 0 15px rgba(255, 223, 164, 0.12);
  transform: translateY(-2px);
}

.nav-links {
  display: flex;
  gap: 2.5rem;
}

.nav-item {
  color: #f1f1f0;
  text-decoration: none;
  font-weight: 300;
  transition: all 0.3s ease;
  position: relative;
}

.nav-item::after {
  content: '';
  position: absolute;
  width: 100%;
  transform: scaleX(0);
  height: 1px;
  bottom: -4px;
  left: 0;
  background-color: #ffdfa4;
  transform-origin: bottom right;
  transition: transform 0.25s ease-out;
}

.nav-item:hover {
  color: #ffdfa4;
}

.nav-item:hover::after {
  transform: scaleX(1);
  transform-origin: bottom left;
}

.hero-title-group {
  margin-top: auto;
  margin-bottom: auto;
  pointer-events: none;
}

.hero-title {
  font-family: 'ApfelGrotezk-Regular', sans-serif;
  font-size: clamp(2rem, 4.5vw, 4.5rem);
  font-weight: normal;
  line-height: 1.25;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: #f1f1f0;
}

.scramble-container {
  display: inline-block;
  min-height: 1.2em;
}

.scramble-text {
  display: inline-block;
  font-variant-numeric: tabular-nums;
}

.client-name {
  font-weight: 600;
  background: linear-gradient(to right, #ffffff, #ffdfa4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 35px rgba(255, 227, 174, 0.08);
}

.hero-tags {
  pointer-events: auto !important;
  position: relative;
  z-index: 10;
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.2rem;
  max-width: 650px;
}

.hero-tags li {
  font-family: 'ApfelGrotezk-Regular', sans-serif;
  font-size: 0.85rem;
  font-weight: 300;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #f1f1f0;
  border: 1px solid rgba(241, 241, 240, 0.08);
  padding: 0.45rem 1.2rem;
  border-radius: 9999px;
  opacity: 0;
  transform: translateY(15px);
  animation: staggerFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-tags li:hover {
  cursor: pointer;
  color: #ffdfa4;
  border-color: rgba(255, 223, 164, 0.45);
  background-color: rgba(255, 223, 164, 0.04);
  box-shadow: 0 0 20px rgba(255, 223, 164, 0.12);
  transform: translateY(-3px) scale(1.02);
  letter-spacing: 0.09em;
}

@keyframes staggerFadeUp {
  0% {
    opacity: 0;
    transform: translateY(15px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.select-none {
  user-select: none;
}

@media (max-width: 768px) {
  .hero-content {
    padding: 2.5rem;
  }
}
</style>
