<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

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

// Интерактивный список тегов интерфейса (прыгающий ховер удален)
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

// Полный перечень глобальных переменных сцены во избежание ReferenceError (dimSun и ambientLight объявлены!)
let scene, camera, renderer, spotlight, lightTarget, dustParticles
let projectorBody, projectorAssembly
let beamMesh, beamShaderMat
let textMesh1, textMesh2 // Невидимые 3D-дубликаты для генерации теней
let dimSun, ambientLight // Глобальные переменные источников света
let loadedFont = null
let animationFrameId
let startTime = performance.now()
let isControlLocked = true // Блокировка прожектора на старте

let targetIntensity = 20
let currentIntensity = 0

let hasMouseMoved = false
const initialTargetX = -2.2
const initialTargetY = 0.0
const targetCameraPos = new THREE.Vector3(0, 0, 9.5)

// Вектор цели для плавного перехода луча к курсору без прыжков
const mouseTarget = new THREE.Vector3(initialTargetX, initialTargetY, -2.0)

// Плавный латинский Scramble-эффект
const scramble = (targetText, reactiveRef, delay = 100, duration = 1000) => {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
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

// Переключение языков с интерактивным перестроением 3D сцены в реальном времени
const toggleLanguage = () => {
  if (isGlobalLightOn.value || isControlLocked) return

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

// Построение невидимого 3D-текста (внутренняя геометрия центрируется)
const update3DTextGeometry = (text, mesh, size) => {
  if (!loadedFont || !mesh) return

  if (mesh.geometry) mesh.geometry.dispose()

  mesh.geometry = new TextGeometry(text, {
    font: loadedFont,
    size: size,
    depth: 0.1,
    curveSegments: 4,
    bevelEnabled: false
  })

  mesh.geometry.center() // Держим геометрию строго по центру локальных осей
}

// Математический пересчет координат DOM-элементов в 3D пространство WebGL
const syncTextPositionAndScale = () => {
  if (!camera || !renderer || !textMesh1 || !textMesh2 || !line1Ref.value || !line2Ref.value) return

  const width = heroContainer.value.clientWidth
  const height = heroContainer.value.clientHeight

  // 1. Получаем точные экранные пиксели элементов
  const rect1 = line1Ref.value.getBoundingClientRect()
  const rect2 = line2Ref.value.getBoundingClientRect()

  // 2. Рассчитываем 3D-размеры усеченного конуса камеры на глубине z = -1.8
  const camZ = camera.position.z
  const textZ = -1.8
  const dist = camZ - textZ
  const vFov = (camera.fov * Math.PI) / 180
  const worldHeight = 2 * Math.tan(vFov / 2) * dist
  const worldWidth = worldHeight * camera.aspect

  const mapRectToMesh = (rect, mesh) => {
    if (rect.width === 0 || rect.height === 0) return

    // Переводим пиксельный центр элемента в NDC (-1..1)
    const pixelX = rect.left + rect.width / 2
    const pixelY = rect.top + rect.height / 2

    const ndcX = (pixelX / width) * 2 - 1
    const ndcY = -(pixelY / height) * 2 + 1

    // Проецируем NDC координаты на 3D мир
    const worldX = ndcX * (worldWidth / 2)
    const worldY = ndcY * (worldHeight / 2)

    mesh.position.set(worldX, worldY, textZ)

    // Находим точную ширину и высоту в единицах WebGL
    const meshWidth3D = (rect.width / width) * worldWidth
    const meshHeight3D = (rect.height / height) * worldHeight

    mesh.geometry.computeBoundingBox()
    const geomWidth = mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x
    const geomHeight = mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y

    if (geomWidth > 0 && geomHeight > 0) {
      // Идеальное масштабирование 3D-копии под габариты HTML текста
      mesh.scale.set(meshWidth3D / geomWidth, meshHeight3D / geomHeight, 1)
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap // Возвращены МЯГКИЕ тени

  // Стенка на заднем плане (Оригинальный темно-серый цвет #0e0e0f)
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

  // Глобальный теплый источник света (Убран const для выноса в глобальный let)
  // Направлен ЗА КАМЕРУ на z = 15.0 для идеальной засветки всей комнаты
  dimSun = new THREE.DirectionalLight(0xe2dcd2, 0.42)
  dimSun.position.set(0, 4.0, 15.0)
  scene.add(dimSun)

  // Убран const для выноса в глобальный let
  ambientLight = new THREE.AmbientLight(0xffffff, 0.04)
  scene.add(ambientLight)

  // --- Модель прожектора у правого верхнего края экрана (y = 1.9) ---
  projectorAssembly = new THREE.Group()
  projectorAssembly.position.set(3.0, 1.9, 3.0)
  scene.add(projectorAssembly)

  const rodLength = 3.5
  const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, rodLength, 16)

  // Металл прожектора изменен на премиальный глубокий черный (0x09090b)
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

  // Линза светится теплым белым
  const lensGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.01, 18)
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff8ee })
  const lens = new THREE.Mesh(lensGeo, lensMat)
  lens.rotation.x = Math.PI / 2
  lens.position.z = -0.39
  projectorBody.add(lens)

  // --- Теплый белый SpotLight ---
  spotlight = new THREE.SpotLight(0xfff8ee, 0, 18, Math.PI / 6.5, 0.5, 0.0)
  spotlight.castShadow = true
  spotlight.shadow.mapSize.width = 2048
  spotlight.shadow.mapSize.height = 2048
  spotlight.shadow.camera.near = 1.0
  spotlight.shadow.camera.far = 15
  spotlight.shadow.bias = -0.001
  spotlight.shadow.radius = 12.0 // Очень мягкие размытые тени
  projectorBody.add(spotlight)

  // Настройка мишени прожектора на глубину z = -2.0 (средний план)
  lightTarget = new THREE.Object3D()
  lightTarget.position.set(initialTargetX, initialTargetY, -2.0)
  scene.add(lightTarget)
  spotlight.target = lightTarget

  // --- ЕДИНЫЙ БЕСШОВНЫЙ ШЕЙДЕРНЫЙ ЛУЧ ---
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

  // --- 100% НЕВИДИМЫЕ 3D-ДУБЛИКАТЫ ---
  const invisibleShadowMat = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  })

  textMesh1 = new THREE.Mesh(new THREE.BufferGeometry(), invisibleShadowMat)
  textMesh1.castShadow = true
  textMesh1.receiveShadow = true
  scene.add(textMesh1)

  textMesh2 = new THREE.Mesh(new THREE.BufferGeometry(), invisibleShadowMat)
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

// Перестройка 3D-геометрии при изменении текста
watch(textLine1, (newText) => {
  update3DTextGeometry(newText, textMesh1, 0.35, 0.5)
  nextTick(syncTextPositionAndScale)
})

watch(textLine2, (newText) => {
  update3DTextGeometry(newText, textMesh2, 0.85, -0.5)
  nextTick(syncTextPositionAndScale)
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

  const elapsedTime = (performance.now() - startTime) / 1000

  // Проверка статуса выключателя глобального света
  if (isGlobalLightOn.value) {
    // Включение яркого выставочного света из-за спины (яркость увеличена в 13+ раз!)
    dimSun.intensity += (20.0 - dimSun.intensity) * 0.05
    ambientLight.intensity += (10.0 - ambientLight.intensity) * 0.05

    // Выключение прожектора и его объемного луча
    spotlight.intensity += (0.0 - spotlight.intensity) * 0.08
    beamShaderMat.uniforms.opacity.value += (0.0 - beamShaderMat.uniforms.opacity.value) * 0.08

    // Прожектор повисает вертикально вниз
    lightTarget.position.x += (3.0 - lightTarget.position.x) * 0.05
    lightTarget.position.y += (-5.0 - lightTarget.position.y) * 0.05
    lightTarget.position.z += (3.0 - lightTarget.position.z) * 0.05

  } else {
    // Стандартный темный режим с прожектором
    dimSun.intensity += (0.2 - dimSun.intensity) * 0.05
    ambientLight.intensity += (0.04 - ambientLight.intensity) * 0.05

    // Плавный розжиг луча
    if (currentIntensity < targetIntensity) {
      currentIntensity += (targetIntensity - currentIntensity) * 0.03
      spotlight.intensity = currentIntensity
      beamShaderMat.uniforms.opacity.value = (currentIntensity / targetIntensity) * 0.06
    } else {
      spotlight.intensity = targetIntensity
      beamShaderMat.uniforms.opacity.value = 0.06
    }

    // Плавная интерполяция положения мишени (Устраняет резкие прыжки луча при разблокировке!)
    const targetX = hasMouseMoved ? mouseTarget.x : initialTargetX
    const targetY = hasMouseMoved ? mouseTarget.y : initialTargetY
    const targetZ = hasMouseMoved ? mouseTarget.z : -2.0

    lightTarget.position.x += (targetX - lightTarget.position.x) * 0.05
    lightTarget.position.y += (targetY - lightTarget.position.y) * 0.05
    lightTarget.position.z += (targetZ - lightTarget.position.z) * 0.05
  }

  // Мягкий параллакс камеры
  camera.position.x += (targetCameraPos.x - camera.position.x) * 0.05
  camera.position.y += (targetCameraPos.y - camera.position.y) * 0.05
  camera.lookAt(0, 0, -1)

  // Наведение прожектора
  if (projectorBody && lightTarget) {
    projectorBody.lookAt(lightTarget.position)
  }

  // Синхронизация проекции в процессе анимации параллакса камеры
  syncTextPositionAndScale()

  // Пыль
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

onMounted(() => {
  initThree()
  animate()

  // Стабильный фоновый импорт кириллического 3D шрифта Montserrat (Fallback-алгоритм)
  const loader = new FontLoader()

  const loadFont = (url) => {
    loader.load(url, (font) => {
      loadedFont = font

      // Синхронизируем 3D-дубликаты после успешного получения шрифта
      update3DTextGeometry(textLine1.value, textMesh1, 0.35)
      update3DTextGeometry(textLine2.value, textMesh2, 0.85)
      nextTick(syncTextPositionAndScale)
    }, undefined, (err) => {
      console.warn("Montserrat font failed, falling back to Helvetiker...", err)
      // В случае блокировки сети загружаем стандартный helvetiker
      loader.load('https://cdn.jsdelivr.net/npm/three@0.155.0/examples/fonts/helvetiker_regular.typeface.json', (fallbackFont) => {
        loadedFont = fallbackFont
        update3DTextGeometry(textLine1.value, textMesh1, 0.35)
        update3DTextGeometry(textLine2.value, textMesh2, 0.85)
        nextTick(syncTextPositionAndScale)
      })
    })
  }

  // Пробуем загрузить кириллический шрифт
  loadFont('https://cdn.jsdelivr.net/gh/Sasha-Z/three-cyrillic-font@master/fonts/Montserrat/Montserrat-Regular.json')

  // Запуск Scramble-эффектов (Запускаются мгновенно при старте, гарантируя отсутствие белого экрана)
  scramble('The lighting studio of', textLine1, 100, 1800)
  scramble('Nikolay Matsnev', textLine2, 500, 2200)

  // Разблокировка управления через 2.5 секунды
  setTimeout(() => {
    isControlLocked = false
  }, 2500)

  window.addEventListener('resize', adjustLayout)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', adjustLayout)

  if (renderer) renderer.dispose()
  scene.traverse((object) => {
    if (object.isMesh || object.isPoints) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose())
      } else {
        object.material.dispose()
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
    <!-- Полноэкранный задний 3D-фон с интегрированным 3D-текстом -->
    <div class="canvas-background">
      <canvas ref="canvas"></canvas>
    </div>

    <!-- Текстовый интерфейс поверх WebGL -->
    <div class="hero-content">
      <!-- Навигационное меню (Хедер портфолио) -->
      <nav class="hero-nav">
        <!-- Кнопки управления (Язык и Свет) на месте логотипа слева -->
        <div class="nav-controls">
          <button class="control-btn lang-btn select-none" @click="toggleLanguage">
            {{ currentLanguage }}
          </button>
          <button class="control-btn light-btn select-none" @click="isGlobalLightOn = !isGlobalLightOn">
            {{ isGlobalLightOn ? (currentLanguage === 'EN' ? 'LIGHT: ON' : 'СВЕТ: ВКЛ') : (currentLanguage === 'EN' ? 'LIGHT: OFF' : 'СВЕТ: ВЫКЛ') }}
          </button>
        </div>

        <!-- Наведение на контейнер ссылок плавно возвращает луч на имя Николай Мацнев -->
        <div class="nav-links" @mouseenter="hasMouseMoved = false">
          <a href="#about" class="nav-item">{{ currentLanguage === 'EN' ? 'About' : 'О нас' }}</a>
          <a href="#portfolio" class="nav-item">{{ currentLanguage === 'EN' ? 'Portfolio' : 'Портфолио' }}</a>
          <a href="#contact" class="nav-item">{{ currentLanguage === 'EN' ? 'Contact' : 'Контакты' }}</a>
        </div>
      </nav>

      <!-- Заголовок выравнивается по левой кромке -->
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
/* Импорт кастомного шрифта оригинального сайта */
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
  background-color: #0e0e0f; /* Скорректировано под цвет оригинального сайта */
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
  padding: 4.5rem; /* Задает единую левую кромку для заголовка и тегов */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* --- Навигационное меню (Хедер) --- */
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

/* Кнопки управления языком и светом */
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

/* Контейнер заголовка выравнивает текст строго по вертикальному центру слева */
.hero-title-group {
  margin-top: auto;
  margin-bottom: auto;
  pointer-events: none; /* Пропускает мышь на WebGL холст */
}

.hero-title {
  font-family: 'ApfelGrotezk-Regular', sans-serif; /* Применение оригинального шрифта */
  font-size: clamp(2rem, 4.5vw, 4.5rem);
  font-weight: normal;
  line-height: 1.25;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: #f1f1f0; /* Оригинальный цвет текста */
}

.scramble-container {
  display: inline-block;
  min-height: 1.2em;
}

.scramble-text {
  display: inline-block;
  font-variant-numeric: tabular-nums;
}

/* Имя и фамилия - ярко выражены в золотой градиент */
.client-name {
  font-weight: 600;
  background: linear-gradient(to right, #ffffff, #ffdfa4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 35px rgba(255, 227, 174, 0.08);
}

.hero-tags {
  pointer-events: auto !important; /* Гарантирует доступ к кликам и наведению */
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

/* --- Анимация плавного появления тегов на оригинальном шрифте --- */
.hero-tags li {
  font-family: 'ApfelGrotezk-Regular', sans-serif; /* Применение оригинального шрифта */
  font-size: 0.85rem;
  font-weight: 300;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #f1f1f0; /* Оригинальный цвет текста */
  border: 1px solid rgba(241, 241, 240, 0.08);
  padding: 0.45rem 1.2rem;
  border-radius: 9999px;
  opacity: 0;
  transform: translateY(15px);
  animation: staggerFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* --- Эффект премиум hover свечения, расширения букв на тегах (Прыгающие буквы удалены!) --- */
.hero-tags li:hover {
  cursor: pointer;
  color: #ffdfa4; /* Теплый янтарный перелив букв */
  border-color: rgba(255, 223, 164, 0.45); /* Мягкое золотистое свечение рамки */
  background-color: rgba(255, 223, 164, 0.04);
  box-shadow: 0 0 20px rgba(255, 223, 164, 0.12);
  transform: translateY(-3px) scale(1.02); /* Интерактивный подъем и микромасштабирование */
  letter-spacing: 0.09em; /* Плавное расширение межбуквенного интервала */
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
