const GLYPHS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789_*?@#$%+=-'
const STATIC_CHARACTER = /[\s.,:;!?…—–\-«»"“”'()]/u

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

const collectTextNodes = (root) => {
  const nodes = []

  const visit = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && child.nodeValue?.trim()) {
        nodes.push(child)
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        visit(child)
      }
    })
  }

  visit(root)
  return nodes
}

const renderFrame = (characters, revealCount) => {
  let mutableIndex = 0

  return characters.map((character) => {
    if (STATIC_CHARACTER.test(character)) return character

    const output = mutableIndex < revealCount ? character : randomGlyph()
    mutableIndex += 1
    return output
  }).join('')
}

export const scrambleElementText = (root, options = {}) => {
  if (!root || typeof window === 'undefined') return () => {}

  const {
    delay = 0,
    duration = 850,
    stagger = 70,
    frameDuration = 45,
  } = options

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {}
  }

  const textNodes = collectTextNodes(root)
  const originals = new Map()
  const timeouts = []
  const intervals = []
  let cancelled = false

  textNodes.forEach((node, nodeIndex) => {
    const originalText = node.nodeValue
    originals.set(node, originalText)
    const characters = Array.from(originalText)
    const mutableCount = characters.filter((character) => !STATIC_CHARACTER.test(character)).length

    if (!mutableCount) return

    node.nodeValue = renderFrame(characters, 0)

    const timeout = window.setTimeout(() => {
      if (cancelled) return

      const totalFrames = Math.max(1, Math.ceil(duration / frameDuration))
      let frame = 0

      const interval = window.setInterval(() => {
        frame += 1
        const revealCount = Math.ceil((frame / totalFrames) * mutableCount)
        node.nodeValue = renderFrame(characters, revealCount)

        if (frame >= totalFrames) {
          window.clearInterval(interval)
          node.nodeValue = originalText
        }
      }, frameDuration)

      intervals.push(interval)
    }, delay + nodeIndex * stagger)

    timeouts.push(timeout)
  })

  return () => {
    cancelled = true
    timeouts.forEach((timeout) => window.clearTimeout(timeout))
    intervals.forEach((interval) => window.clearInterval(interval))
    originals.forEach((originalText, node) => {
      if (node.isConnected) node.nodeValue = originalText
    })
  }
}
