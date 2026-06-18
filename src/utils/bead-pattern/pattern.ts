import type { ProcessedPattern, ShoppingListItem } from '../../types'
import { closestColor, hexToRgb } from './color'
import { BEAD_PALETTE } from './palette'

const WHITE = BEAD_PALETTE[0]
const BEAD_DISPLAY_SIZE = 28

function loadImage(imageSrc: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = imageSrc
  })
}

function getPatternDimensions(image: HTMLImageElement, gridSize: number) {
  let width = gridSize
  let height = gridSize

  if (image.width > image.height) {
    height = Math.max(1, Math.round((image.height / image.width) * gridSize))
  } else {
    width = Math.max(1, Math.round((image.width / image.height) * gridSize))
  }

  return { width, height }
}

function buildShoppingList(counts: Record<string, number>): ShoppingListItem[] {
  return Object.entries(counts)
    .map(([id, count]) => ({
      color: BEAD_PALETTE.find((item) => item.id === id) ?? WHITE,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function processImageToPattern(
  imageSrc: string,
  gridSize: number,
  usePalette: boolean,
): Promise<ProcessedPattern> {
  const image = await loadImage(imageSrc)
  const { width, height } = getPatternDimensions(image, gridSize)

  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = width
  offscreenCanvas.height = height

  const offscreenContext = offscreenCanvas.getContext('2d')
  if (!offscreenContext) {
    throw new Error('无法初始化画布')
  }

  offscreenContext.drawImage(image, 0, 0, width, height)
  const { data } = offscreenContext.getImageData(0, 0, width, height)
  const counts: Record<string, number> = {}
  const cells: ProcessedPattern['cells'] = []
  const [whiteR, whiteG, whiteB] = hexToRgb(WHITE.hex)

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const a = data[index + 3]

    if (a < 128) {
      cells.push({ r: whiteR, g: whiteG, b: whiteB, colorId: WHITE.id })
      continue
    }

    if (!usePalette) {
      cells.push({ r, g, b })
      continue
    }

    const nearest = closestColor(r, g, b)
    const [matchedR, matchedG, matchedB] = hexToRgb(nearest.hex)
    counts[nearest.id] = (counts[nearest.id] ?? 0) + 1
    cells.push({ r: matchedR, g: matchedG, b: matchedB, colorId: nearest.id })
  }

  return {
    width,
    height,
    cells,
    shoppingList: usePalette ? buildShoppingList(counts) : [],
  }
}

export function drawPatternToCanvas(
  canvas: HTMLCanvasElement,
  pattern: ProcessedPattern,
  usePalette: boolean,
) {
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  canvas.width = pattern.width * BEAD_DISPLAY_SIZE
  canvas.height = pattern.height * BEAD_DISPLAY_SIZE

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let y = 0; y < pattern.height; y += 1) {
    for (let x = 0; x < pattern.width; x += 1) {
      const cell = pattern.cells[(y * pattern.width) + x]
      const cx = (x * BEAD_DISPLAY_SIZE) + (BEAD_DISPLAY_SIZE / 2)
      const cy = (y * BEAD_DISPLAY_SIZE) + (BEAD_DISPLAY_SIZE / 2)
      const radius = (BEAD_DISPLAY_SIZE / 2) - 1

      context.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`
      context.beginPath()
      context.arc(cx, cy, radius, 0, Math.PI * 2)
      context.fill()

      context.fillStyle = 'rgba(255, 255, 255, 0.3)'
      context.beginPath()
      context.arc(cx, cy, radius * 0.3, 0, Math.PI * 2)
      context.fill()

      if (!usePalette || BEAD_DISPLAY_SIZE < 20) {
        continue
      }

      const colorId = cell.colorId ?? closestColor(cell.r, cell.g, cell.b).id
      const isLight = ((cell.r * 0.299) + (cell.g * 0.587) + (cell.b * 0.114)) > 150
      context.fillStyle = isLight ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)'
      context.font = `bold ${Math.max(10, BEAD_DISPLAY_SIZE * 0.35)}px 'Space Mono', monospace`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(colorId, cx, cy + 1)
    }
  }
}
