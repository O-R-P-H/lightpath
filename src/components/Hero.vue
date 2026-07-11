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

function getRussianTag(original) {
  const map = {
    'Concept': 'Концепция',
    'Light': 'Свет',
    'Design': 'Дизайн',
    'Architecture': 'Архитектура',
    'Atmosphere': 'Атмосфера',
    'Installation': 'Инсталляция',
    'Innovation': 'Инновации',
    'Art': 'Искусство',
    'Impact': 'Влияние'
  }
  return map[original] || original
}

// Глобальные переменные сцены
let scene, camera, renderer, spotlight, lightTarget, dustParticles, wall, floor
let projectorBody, projectorAssembly, lensDummy
let beamMesh, beamShaderMat
let textMeshes1 = [] // Массив копий для утолщения тени 1-й строки
let textMeshes2 = [] // Массив копий для утолщения тени 2-й строки
let dimSun, ambientLight
let animationFrameId
let startTime = performance.now()
let isControlLocked = true // Блокировка прожектора на старте

// Переменные для мобильного акселерометра
let hasInitializedAccelerometer = false
let neutralBeta = null

// Кэшированная ширина геометрии букв для предотвращения искажений при масштабировании
let text1GeomWidth = 1
let text2GeomWidth = 1

// Ссылки на подготовленные Blob URL шрифтов
let apfelBlobUrl = null
let montserratBlobUrl = null

let targetIntensity = 20
let currentIntensity = 0

let hasMouseMoved = false
const initialTargetX = -2.2
const initialTargetY = 0.0
const targetCameraPos = new THREE.Vector3(0, 0, 9.5)

// Вектор цели для плавного перехода луча к курсору
const mouseTarget = new THREE.Vector3(initialTargetX, initialTargetY, -2.0)

// Проверка мобильного устройства
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
}

// Плавный латинский/кириллический Scramble-эффект
function scramble(targetText, reactiveRef, delay = 100, duration = 1000) {
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

// Запуск анимации на все тексты страницы
function runGlobalScramble() {
  const isEn = currentLanguage.value === 'EN'

  // Безопасное переключение шрифта 3D-сцены
  if (textMeshes1.length && textMeshes2.length) {
    const activeFont = isEn
        ? (apfelBlobUrl || '/ApfelGrotezk-Regular.Cf-knoBG.woff')
        : (montserratBlobUrl || '/Montserrat-Bold.ttf')

    textMeshes1.forEach(m => m.font = activeFont)
    textMeshes2.forEach(m => m.font = activeFont)
  }

  scramble(isEn ? 'The lighting studio of' : 'Световая студия', textLine1, 100, 1000)
  scramble(isEn ? 'Nikolay Matsnev' : 'Николая Мацнева', textLine2, 350, 1200)

  tags.value.forEach((tag, idx) => {
    const targetVal = isEn ? tag.original : getRussianTag(tag.original)
    scramble(targetVal, (val) => {
      tag.current = val
    }, 450 + idx * 75, 800)
  })
}

// Переключение языков
function toggleLanguage() {
  if (isControlLocked) return
  currentLanguage.value = currentLanguage.value === 'EN' ? 'RU' : 'EN'
  runGlobalScramble()
}

// Возврат луча прожектора на исходную позицию при наведении на навигацию
function onNavHover() {
  hasMouseMoved = false
}

// Построение невидимого 3D-текста с сохранением пропорций и интервалов
function update3DTextGeometry(text, meshes, size, cacheKey) {
  if (!meshes || meshes.length === 0) return

  meshes.forEach((mesh) => {
    mesh.text = text.toUpperCase()
    mesh.fontSize = size
    mesh.letterSpacing = -0.02

    mesh.sync(() => {
      if (mesh.material) {
        mesh.material.colorWrite = false
        mesh.material.depthWrite = true
      }
      if (mesh.geometry) {
        mesh.geometry.computeBoundingBox()
        const bbox = mesh.geometry.boundingBox
        if (bbox) {
          const w = bbox.max.x - bbox.min.x
          if (w > 0) {
            if (cacheKey === 1) text1GeomWidth = w
            if (cacheKey === 2) text2GeomWidth = w
          }
        }
      }
      syncTextPositionAndScale()
    })
  })
}

// Математический пересчет координат DOM-элементов в 3D пространство WebGL
function syncTextPositionAndScale() {
  if (!camera || !renderer || !textMeshes1.length || !textMeshes2.length || !line1Ref.value || !line2Ref.value) return

  const width = heroContainer.value.clientWidth
  const height = heroContainer.value.clientHeight

  const rect1 = line1Ref.value.getBoundingClientRect()
  const rect2 = line2Ref.value.getBoundingClientRect()

  const camZ = camera.position.z
  // Плоскость текста максимально близко к стене (z = -4.0) для точного совпадения тени
  const textZ = -3.6
  const dist = camZ - textZ
  const vFov = (camera.fov * Math.PI) / 180
  const worldHeight = 2 * Math.tan(vFov / 2) * dist
  const worldWidth = worldHeight * camera.aspect

  const mapRectToMeshes = (rect, meshes, geomWidth, size) => {
    if (rect.width === 0 || rect.height === 0 || !meshes || meshes.length === 0) return

    const pixelX = rect.left + rect.width / 2
    const pixelY = rect.top + rect.height / 2

    const ndcX = (pixelX / width) * 2 - 1
    const ndcY = -(pixelY / height) * 2 + 1

    const worldX = ndcX * (worldWidth / 2)
    const worldY = ndcY * (worldHeight / 2)

    const isEn = currentLanguage.value === 'EN'
    // Сверхплотное смещение (0.8%), чтобы тени слились в монолитный Bold без паразитного контура
    const offset = isEn ? (size * 0.008) : 0

    const offsets = [
      [0, 0],
      [-offset, 0],
      [offset, 0],
      [0, -offset],
      [0, offset]
    ]

    meshes.forEach((mesh, idx) => {
      const ox = offsets[idx][0]
      const oy = offsets[idx][1]
      mesh.position.set(worldX + ox, worldY + oy, textZ)

      const meshWidth3D = (rect.width / width) * worldWidth

      if (geomWidth > 0) {
        const scaleFactor = meshWidth3D / geomWidth
        mesh.scale.set(scaleFactor, scaleFactor, 1)
      }
    });
  }

  mapRectToMeshes(rect1, textMeshes1, text1GeomWidth, 0.35)
  mapRectToMeshes(rect2, textMeshes2, text2GeomWidth, 0.85)
}

function createBeamTexture() {
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

function initThree() {
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

  // Стенка на заднем плане (сохранены ваши параметры цвета, шероховатости и металла)
  const wallGeo = new THREE.PlaneGeometry(35, 20)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 1,
    metalness: 0.0
  })
  wall = new THREE.Mesh(wallGeo, wallMat)
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
  floor = new THREE.Mesh(floorGeo, floorMat)
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

  // Маркер для отслеживания мировых координат выхода луча
  lensDummy = new THREE.Object3D()
  lensDummy.position.set(0, 0, -0.4)
  projectorBody.add(lensDummy)

  // SpotLight (вынесен в корень сцены для корректного расчета теней)
  spotlight = new THREE.SpotLight(0xfff8ee, 0, 18, Math.PI / 6.5, 0.5, 0.0)
  spotlight.castShadow = true
  spotlight.shadow.mapSize.width = 2048
  spotlight.shadow.mapSize.height = 2048
  spotlight.shadow.camera.near = 1.0
  spotlight.shadow.camera.far = 15
  spotlight.shadow.bias = -0.0005
  spotlight.shadow.radius = 1.5 // Уменьшенный радиус размытия для соответствия четкости шрифта
  scene.add(spotlight)

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

  // --- ИНИЦИАЛИЗАЦИЯ TROIKA-THREE-TEXT (Массивы клонов для 5-точечного мульти-сэмплинга) ---
  for (let i = 0; i < 5; i++) {
    const t1 = new Text()
    t1.anchorX = 'center'
    t1.anchorY = 'middle'
    t1.castShadow = true
    t1.receiveShadow = true
    scene.add(t1)
    textMeshes1.push(t1)

    const t2 = new Text()
    t2.anchorX = 'center'
    t2.anchorY = 'middle'
    t2.castShadow = true
    t2.receiveShadow = true
    scene.add(t2)
    textMeshes2.push(t2)
  }

  createDustParticles()
  adjustLayout()
}

function createDustParticles() {
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

function onMouseMove(event) {
  if (isControlLocked) return
  if (!heroContainer.value || !lightTarget) return
  // Отключаем следование за мышью на мобильных устройствах
  if (isMobileDevice()) return

  if (!hasMouseMoved) {
    hasMouseMoved = true
  }

  const rect = heroContainer.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  mouseTarget.set(x * 10, y * 6.5, -2.0)
}

function onMouseLeave() {
  if (!lightTarget) return
  hasMouseMoved = false
}

// Запрос и инициализация акселерометра (iOS Safari + Android)
function initAccelerometer() {
  if (hasInitializedAccelerometer) return
  hasInitializedAccelerometer = true

  // Специфика iOS 13+ (Safari): требуется явный асинхронный запрос прав в контексте User Gesture
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation)
          }
        })
        .catch(e => {
          console.warn("DeviceOrientation permission deferred or rejected", e)
          hasInitializedAccelerometer = false // Сброс флага для возможности повторной инициализации при клике
        })
  } else {
    // Android и старые версии iOS
    window.addEventListener('deviceorientation', handleOrientation)
  }
}

// Слушатель касания для Safari на мобильных устройствах
function onDeviceTouch() {
  if (isMobileDevice()) {
    initAccelerometer()
  }
}

// Обработчик наклона устройства (реализует обратное отклонение)
function handleOrientation(event) {
  if (isControlLocked || !lightTarget) return

  const beta = event.beta   // Наклон вперед-назад [-180, 180]
  const gamma = event.gamma // Наклон влево-вправо [-90, 90]

  if (beta === null || gamma === null) return

  // Калибровка нейтрального положения при удержании телефона под наклоном при запуске
  if (neutralBeta === null) {
    neutralBeta = (beta > 30 && beta < 80) ? beta : 60
  }

  const deltaGamma = gamma
  const deltaBeta = beta - neutralBeta

  const maxDeflectionX = 6.0
  const maxDeflectionY = 4.0

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

  // Рассчитываем отклонение в ПРОТИВОПОЛОЖНУЮ наклону сторону (знак минус)
  const offsetX = clamp(-deltaGamma * 0.2, -maxDeflectionX, maxDeflectionX)
  const offsetY = clamp(-deltaBeta * 0.15, -maxDeflectionY, maxDeflectionY)

  hasMouseMoved = true
  mouseTarget.set(initialTargetX + offsetX, initialTargetY + offsetY, -2.0)
}

// Отслеживание изменений текста (с приведением к UPPERCASE)
watch(textLine1, (newText) => {
  update3DTextGeometry(newText.toUpperCase(), textMeshes1, 0.35, 1)
})

watch(textLine2, (newText) => {
  update3DTextGeometry(newText.toUpperCase(), textMeshes2, 0.85, 2)
})

function adjustLayout() {
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

function animate() {
  animationFrameId = requestAnimationFrame(animate)

  if (isGlobalLightOn.value) {
    dimSun.intensity += (20.0 - dimSun.intensity) * 0.05
    ambientLight.intensity += (10.0 - ambientLight.intensity) * 0.05

    spotlight.intensity += (0.0 - spotlight.intensity) * 0.08
    beamShaderMat.uniforms.opacity.value += (0.0 - beamShaderMat.uniforms.opacity.value) * 0.08

    lightTarget.position.x += (3.0 - lightTarget.position.x) * 0.05
    lightTarget.position.y += (-5.0 - lightTarget.position.y) * 0.05
    lightTarget.position.z += (3.0 - lightTarget.position.z) * 0.05

    // Плавное переключение цвета стены и пола на 0x808080 при включении света (скорость 0.005 сохранены)
    if (wall) {
      wall.material.color.lerp(new THREE.Color(0x808080), 0.005)
    }
    if (floor) {
      floor.material.color.lerp(new THREE.Color(0x808080), 0.005)
    }

  } else {
    // Поднимаем фоновое освещение до 0.52 и 0.55, чтобы сделать тени блеклыми и ненавязчивыми
    dimSun.intensity += (0.55 - dimSun.intensity) * 0.05
    ambientLight.intensity += (0.52 - ambientLight.intensity) * 0.05

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

    // Плавный возврат цвета стены и пола к исходному темному оттенку при выключении света
    if (wall) {
      wall.material.color.lerp(new THREE.Color(0x0d0d10), 0.05)
    }
    if (floor) {
      floor.material.color.lerp(new THREE.Color(0x0a0a0c), 0.05)
    }
  }

  camera.position.x += (targetCameraPos.x - camera.position.x) * 0.05
  camera.position.y += (targetCameraPos.y - camera.position.y) * 0.05
  camera.lookAt(0, 0, -1)

  if (projectorBody && lightTarget) {
    projectorBody.lookAt(lightTarget.position)
  }

  // Обновляем позицию источника света из мировых координат линзы прожектора
  if (spotlight && lensDummy) {
    const lensWorldPos = new THREE.Vector3()
    lensDummy.getWorldPosition(lensWorldPos)
    spotlight.position.copy(lensWorldPos)
  }

  syncTextPositionAndScale()

  if (dustParticles) {
    const positions = dustParticles.geometry.attributes.position.array
    const velocities = dustParticles.userData.velocities

    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3] += velocities[i].x
      positions[i * 3 + 1] += velocities[i].y
      positions[i * 3 + 2] += velocities[i].z

      if (positions[i * 3 + 1] > 5) {
        positions[i * 3 + 1] = -5
        positions[i * 3] = (Math.random() - 0.5) * 16
      }
    }
    dustParticles.geometry.attributes.position.needsUpdate = true
  }

  renderer.render(scene, camera)
}

// Надежная последовательная предзагрузка шрифтов
async function loadFontAssets() {
  // 1. Загрузка Apfel Grotezk
  try {
    const response = await fetch('/ApfelGrotezk-Regular.Cf-knoBG.woff')
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const blob = new Blob([buffer], { type: 'font/woff' })
      apfelBlobUrl = URL.createObjectURL(blob)
    }
  } catch (e) {
    console.warn("Failed to load ApfelGrotezk font", e)
  }

  // 2. Загрузка Montserrat-Bold
  try {
    const response = await fetch('/Montserrat-Bold.ttf')
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const blob = new Blob([buffer], { type: 'font/ttf' })
      montserratBlobUrl = URL.createObjectURL(blob)
    }
  } catch (e) {
    console.warn("Failed to load Montserrat font", e)
  }
}

onMounted(() => {
  initThree()
  animate()

  // Гарантируем полную загрузку ресурсов до отрисовки
  loadFontAssets().finally(() => {
    const initialFont = currentLanguage.value === 'EN'
        ? (apfelBlobUrl || '/ApfelGrotezk-Regular.Cf-knoBG.woff')
        : (montserratBlobUrl || '/Montserrat-Bold.ttf')

    if (textMeshes1.length && textMeshes2.length) {
      textMeshes1.forEach(m => m.font = initialFont)
      textMeshes2.forEach(m => m.font = initialFont)
    }

    // Первичная инициализация с принудительным uppercase
    update3DTextGeometry(textLine1.value.toUpperCase(), textMeshes1, 0.35, 1)
    update3DTextGeometry(textLine2.value.toUpperCase(), textMeshes2, 0.85, 2)

    // Запуск Scramble-эффектов
    runGlobalScramble()
  })

  setTimeout(() => {
    isControlLocked = false
  }, 2500)

  window.addEventListener('resize', adjustLayout)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', adjustLayout)
  window.removeEventListener('deviceorientation', handleOrientation)

  // Очистка Blob-адресов
  if (apfelBlobUrl) URL.revokeObjectURL(apfelBlobUrl)
  if (montserratBlobUrl) URL.revokeObjectURL(montserratBlobUrl)

  textMeshes1.forEach(m => {
    if (typeof m.dispose === 'function') m.dispose()
  })
  textMeshes2.forEach(m => {
    if (typeof m.dispose === 'function') m.dispose()
  })

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
  <!-- События onTouchStart и onClick инициализируют акселерометр по первому тачу пользователя -->
  <header
      ref="heroContainer"
      class="hero-header"
      :class="{ 'light-theme': isGlobalLightOn, 'lang-ru': currentLanguage === 'RU' }"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @touchstart="onDeviceTouch"
      @click="onDeviceTouch"
  >
    <div class="canvas-background">
      <canvas ref="canvas"></canvas>
    </div>

    <div class="hero-content">
      <!-- Наведение на nav возвращает луч на исходную позицию (когда мышь за экраном) -->
      <nav class="hero-nav" @mouseenter="onNavHover">
        <div class="nav-controls">
          <button class="control-btn lang-btn select-none" @click="toggleLanguage">
            {{ currentLanguage }}
          </button>

          <button
              class="control-btn theme-btn select-none"
              @click="isGlobalLightOn = !isGlobalLightOn"
              :aria-label="isGlobalLightOn ? 'Switch to dark theme' : 'Switch to light theme'"
          >
            <svg v-if="isGlobalLightOn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </div>

        <div class="nav-links">
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

      <!-- Теги как простой, монолитный и жирный текст без «пузырей» -->
      <ul class="hero-tags">
        <li
            v-for="(tag, idx) in tags"
            :key="idx"
            :style="`animation-delay: ${0.7 + idx * 0.05}s;`"
        >
          {{ tag.current }}
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

@font-face {
  font-family: 'Montserrat';
  src: url('/Montserrat-Bold.ttf') format('truetype');
  font-weight: bold;
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
  gap: 1rem;
}

/* Монолитный дизайн кнопок без обводок */
.control-btn {
  background: rgba(241, 241, 240, 0);
  border: none;
  color: #f1f1f0;
  font-family: 'ApfelGrotezk-Regular', sans-serif;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.45rem 1.2rem;
  border-radius: 9999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-icon {
  width: 1.1rem;
  height: 1.1rem;
  display: block;
}

.control-btn:hover .theme-icon {
  transform: rotate(18deg);
}

.nav-links {
  display: flex;
  gap: 2.5rem;
}

.nav-item {
  color: #f1f1f0;
  text-decoration: none;
  font-weight: bold;
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

/* Монолитный плотный Bold заголовок без обводок с уменьшенным line-height */
.hero-title {
  font-family: 'ApfelGrotezk-Regular', sans-serif;
  font-size: clamp(2rem, 5vw, 5.5rem);
  font-weight: bold;
  line-height: 1.1;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: #f1f1f0;
  text-shadow: none;
  -webkit-text-stroke: none;
}

/* Стилизация под Montserrat для русской локализации */
.lang-ru .hero-title,
.lang-ru .client-name,
.lang-ru .hero-tags li,
.lang-ru .nav-item,
.lang-ru .control-btn {
  font-family: 'Montserrat', sans-serif;
  font-weight: bold;
}

.scramble-container {
  display: inline-block;
  min-height: 1.2em;
}

.scramble-text {
  display: inline-block;
  font-variant-numeric: tabular-nums;
}

/* Монолитный текст имени */
.client-name {
  font-weight: bold;
  color: #f1f1f0;
  text-shadow: none;
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
  gap: 0.5rem 2rem;
  max-width: 650px;
}

/* Монолитный жирный дизайн тегов БЕЗ рамок и подложек */
.hero-tags li {
  font-family: 'ApfelGrotezk-Regular', sans-serif;
  font-size: 0.85rem;
  font-weight: bold;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #f1f1f0;
  border: none;
  background: none;
  padding: 0;
  border-radius: 0;
  opacity: 0;
  transform: translateY(15px);
  animation: staggerFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.hero-tags li:hover {
  cursor: pointer;
  color: #ffdfa4;
  transform: translateY(-2px);
  letter-spacing: 0.08em;
}

/* Плавные переходы для всех элементов интерфейса */
.hero-nav,
.hero-title,
.client-name,
.nav-item,
.hero-tags li,
.control-btn,
.theme-icon {
  transition: color 0.5s cubic-bezier(0.16, 1, 0.3, 1),
  background-color 0.5s cubic-bezier(0.16, 1, 0.3, 1),
  transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
  letter-spacing 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* --- СТИЛИ СВЕТЛОЙ ТЕМЫ (С ПЛАВНЫМ ПЕРЕХОДОМ В #646160) --- */
.light-theme .hero-nav,
.light-theme .hero-title,
.light-theme .client-name,
.light-theme .nav-item,
.light-theme .hero-tags li {
  color: #000000;
}

.light-theme .control-btn {
  background: rgba(100, 97, 96, 0);
  color: #000000;
}

.light-theme .control-btn:hover {
  background: rgba(100, 97, 96, 0.14);
  color: #1a1a1a;
}

.light-theme .theme-icon {
  color: #000000;
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
