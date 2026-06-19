import type {
  BeadColor,
  PatternProcessingOptions,
  PatternRecommendation,
  ProcessedPattern,
  ShoppingListItem,
} from '../../types'
import { closestColor, deltaE, hexToLab, hexToRgb, rgbToLab } from './color'
import { BASIC_BEAD_PALETTE, BEAD_PALETTE } from './palette'

type Lab = ReturnType<typeof rgbToLab>

type PixelSample = {
  r: number
  g: number
  b: number
  lab: Lab
}

type ClusterCenter = {
  r: number
  g: number
  b: number
  lab: Lab
}

export const DEFAULT_PATTERN_PROCESSING_OPTIONS: PatternProcessingOptions = {
  mode: 'auto',
  targetColorCount: 8,
  autoRecommendColorCount: true,
  denoise: true,
  mergeSimilarColors: true,
}

const WHITE = BASIC_BEAD_PALETTE[0]
const BEAD_DISPLAY_SIZE = 28
const AUTO_COLOR_COUNT_MAX = 12
const SIMILAR_COLOR_THRESHOLD = 5

// 推荐网格
const MIN_GRID = 28
const MAX_GRID = 72
const DENSITY_LOW = 0.04
const DENSITY_HIGH = 0.40

const SUPERSAMPLE = 3

// 描边像素级判定（独立通道，不参与彩色聚类，保持细线不糊）
const OUTLINE_MAX_BRIGHTNESS = 70
const OUTLINE_MAX_CHROMA = 42
const OUTLINE_FORCE_BRIGHTNESS = 48

// 暗 + 低彩度只 snap 中性色
const NEUTRAL_LOCK_BRIGHTNESS = 95
const NEUTRAL_LOCK_CHROMA = 35
const NEUTRAL_PALETTE_CHROMA = 30

// 强制清杂色：占比低于此阈值的色号并到最接近的保留色（仅推荐/合并模式）
const RARE_COLOR_RATIO = 0.025

const OUTLINE_COLOR: BeadColor =
  BASIC_BEAD_PALETTE.find((c) => c.id === 'H9') ??
  [...BASIC_BEAD_PALETTE].sort((a, b) => brightnessOfHex(a.hex) - brightnessOfHex(b.hex))[0]

const NEUTRAL_PALETTE: BeadColor[] = BASIC_BEAD_PALETTE.filter((c) => {
  const [r, g, b] = hexToRgb(c.hex)
  return (Math.max(r, g, b) - Math.min(r, g, b)) < NEUTRAL_PALETTE_CHROMA
})

function brightnessOfHex(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  return (r * 0.299) + (g * 0.587) + (b * 0.114)
}
function brightnessOf(r: number, g: number, b: number) {
  return (r * 0.299) + (g * 0.587) + (b * 0.114)
}
function chromaOf(r: number, g: number, b: number) {
  return Math.max(r, g, b) - Math.min(r, g, b)
}
function isOutlinePixel(r: number, g: number, b: number) {
  const brightness = brightnessOf(r, g, b)
  if (brightness <= OUTLINE_FORCE_BRIGHTNESS) {
    return true
  }
  return brightness <= OUTLINE_MAX_BRIGHTNESS && chromaOf(r, g, b) <= OUTLINE_MAX_CHROMA
}
function paletteForColor(r: number, g: number, b: number): BeadColor[] {
  if (brightnessOf(r, g, b) < NEUTRAL_LOCK_BRIGHTNESS && chromaOf(r, g, b) < NEUTRAL_LOCK_CHROMA) {
    return NEUTRAL_PALETTE.length > 0 ? NEUTRAL_PALETTE : BASIC_BEAD_PALETTE
  }
  return BASIC_BEAD_PALETTE
}

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

function distanceSquared(color1: Lab, color2: Lab) {
  return (
    (color1.l - color2.l) ** 2 +
    (color1.a - color2.a) ** 2 +
    (color1.b - color2.b) ** 2
  )
}

/* ------------------------------------------------------------------ *
 * 推荐网格尺寸
 * ------------------------------------------------------------------ */
function recommendGridSize(image: HTMLImageElement) {
  const w = 128
  const h = Math.max(1, Math.round((image.height / image.width) * w))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return 48
  }
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(image, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4
    gray[i] = (data[o] * 0.299) + (data[o + 1] * 0.587) + (data[o + 2] * 0.114)
  }
  let edgeCount = 0
  let total = 0
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const gx = gray[(y * w) + (x + 1)] - gray[(y * w) + (x - 1)]
      const gy = gray[((y + 1) * w) + x] - gray[((y - 1) * w) + x]
      if (Math.abs(gx) + Math.abs(gy) > 48) {
        edgeCount += 1
      }
      total += 1
    }
  }
  const density = total > 0 ? edgeCount / total : 0
  const t = Math.min(1, Math.max(0, (density - DENSITY_LOW) / (DENSITY_HIGH - DENSITY_LOW)))
  const grid = Math.round(MIN_GRID + ((MAX_GRID - MIN_GRID) * t))
  return Math.min(MAX_GRID, Math.max(MIN_GRID, grid))
}

/* ------------------------------------------------------------------ *
 * 降采样 + 每格众数采样
 * ------------------------------------------------------------------ */
function sampleGrid(image: HTMLImageElement, width: number, height: number) {
  const superW = width * SUPERSAMPLE
  const superH = height * SUPERSAMPLE
  const canvas = document.createElement('canvas')
  canvas.width = superW
  canvas.height = superH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法初始化画布')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, superW, superH)
  const { data } = ctx.getImageData(0, 0, superW, superH)

  const cells: Array<PixelSample | null> = new Array(width * height).fill(null)
  for (let gy = 0; gy < height; gy += 1) {
    for (let gx = 0; gx < width; gx += 1) {
      const bucket = new Map<string, { count: number, r: number, g: number, b: number, outline: number }>()
      let opaque = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = (gx * SUPERSAMPLE) + sx
          const py = (gy * SUPERSAMPLE) + sy
          const idx = ((py * superW) + px) * 4
          if (data[idx + 3] < 128) {
            continue
          }
          opaque += 1
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const outline = isOutlinePixel(r, g, b) ? 1 : 0
          const key = `${r >> 4}-${g >> 4}-${b >> 4}-${outline}`
          const entry = bucket.get(key)
          if (entry) {
            entry.count += 1
            entry.r += r
            entry.g += g
            entry.b += b
          } else {
            bucket.set(key, { count: 1, r, g, b, outline })
          }
        }
      }
      if (opaque < (SUPERSAMPLE * SUPERSAMPLE) / 2) {
        cells[(gy * width) + gx] = null
        continue
      }
      let best: { count: number, r: number, g: number, b: number, outline: number } | null = null
      for (const entry of bucket.values()) {
        const weight = entry.count + (entry.outline ? 0.5 : 0)
        const bestWeight = best ? best.count + (best.outline ? 0.5 : 0) : -1
        if (weight > bestWeight) {
          best = entry
        }
      }
      if (!best) {
        cells[(gy * width) + gx] = null
        continue
      }
      const r = Math.round(best.r / best.count)
      const g = Math.round(best.g / best.count)
      const b = Math.round(best.b / best.count)
      cells[(gy * width) + gx] = { r, g, b, lab: rgbToLab([r, g, b]) }
    }
  }
  return cells
}

/* ------------------------------------------------------------------ *
 * k-means++（仅彩色像素，用于决定量化代表色）
 * ------------------------------------------------------------------ */
function pickInitialCenters(pixels: PixelSample[], centerCount: number) {
  const unique = Array.from(new Map(pixels.map((p) => [`${p.r},${p.g},${p.b}`, p])).values())
  const centers: ClusterCenter[] = [{ ...unique[0] }]
  while (centers.length < centerCount && centers.length < unique.length) {
    let bestPixel = unique[0]
    let bestScore = -1
    for (const pixel of unique) {
      let minDistance = Number.POSITIVE_INFINITY
      for (const center of centers) {
        minDistance = Math.min(minDistance, distanceSquared(pixel.lab, center.lab))
      }
      if (minDistance > bestScore) {
        bestScore = minDistance
        bestPixel = pixel
      }
    }
    centers.push({ ...bestPixel })
  }
  return centers
}

function quantizePixels(pixels: PixelSample[], targetColorCount: number) {
  if (pixels.length === 0) {
    return { assignments: [] as number[], centers: [] as ClusterCenter[] }
  }
  const centerCount = Math.max(1, Math.min(Math.round(targetColorCount), pixels.length))
  let centers = pickInitialCenters(pixels, centerCount)
  const assignments = new Array<number>(pixels.length).fill(0)
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const next = centers.map(() => ({ count: 0, r: 0, g: 0, b: 0, l: 0, a: 0, labB: 0 }))
    let changed = false
    for (let i = 0; i < pixels.length; i += 1) {
      const pixel = pixels[i]
      let bestIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY
      for (let c = 0; c < centers.length; c += 1) {
        const distance = distanceSquared(pixel.lab, centers[c].lab)
        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = c
        }
      }
      if (assignments[i] !== bestIndex) {
        changed = true
        assignments[i] = bestIndex
      }
      const bucket = next[bestIndex]
      bucket.count += 1
      bucket.r += pixel.r
      bucket.g += pixel.g
      bucket.b += pixel.b
      bucket.l += pixel.lab.l
      bucket.a += pixel.lab.a
      bucket.labB += pixel.lab.b
    }
    centers = centers.map((center, index) => {
      const bucket = next[index]
      if (bucket.count === 0) {
        return center
      }
      return {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
        lab: { l: bucket.l / bucket.count, a: bucket.a / bucket.count, b: bucket.labB / bucket.count },
      }
    })
    if (!changed && iteration > 0) {
      break
    }
  }
  return { assignments, centers }
}

function computeQuantizationError(pixels: PixelSample[], assignments: number[], centers: ClusterCenter[]) {
  if (pixels.length === 0 || centers.length === 0) {
    return 0
  }
  let total = 0
  for (let i = 0; i < pixels.length; i += 1) {
    const center = centers[assignments[i]]
    if (center) {
      total += distanceSquared(pixels[i].lab, center.lab)
    }
  }
  return total / pixels.length
}

function samplePixelsForRecommendation(pixels: PixelSample[], sampleSize = 1500) {
  if (pixels.length <= sampleSize) {
    return pixels
  }
  const step = pixels.length / sampleSize
  const sampled: PixelSample[] = []
  for (let i = 0; i < sampleSize; i += 1) {
    sampled.push(pixels[Math.floor(i * step)])
  }
  return sampled
}

function recommendColorCount(pixels: PixelSample[], maxCandidateCount: number) {
  const sampled = samplePixelsForRecommendation(pixels)
  const maxCount = Math.max(2, Math.min(maxCandidateCount, sampled.length))
  if (sampled.length < 2 || maxCount <= 2) {
    return Math.min(2, maxCount)
  }
  const errors: number[] = []
  for (let k = 2; k <= maxCount; k += 1) {
    const { assignments, centers } = quantizePixels(sampled, k)
    errors.push(computeQuantizationError(sampled, assignments, centers))
  }
  const maxError = Math.max(...errors, 1)
  const penalty = 0.05
  let bestK = 2
  let bestCost = Number.POSITIVE_INFINITY
  for (let i = 0; i < errors.length; i += 1) {
    const k = i + 2
    const cost = (errors[i] / maxError) + (penalty * k)
    if (cost < bestCost) {
      bestCost = cost
      bestK = k
    }
  }
  return bestK
}

/* ------------------------------------------------------------------ *
 * ΔE 合并相近色号
 * ------------------------------------------------------------------ */
function buildColorAliases(counts: Record<string, number>, palette: BeadColor[], threshold: number) {
  const paletteById = new Map(palette.map((color) => [color.id, color]))
  const aliases: Record<string, string> = {}
  const keptIds: string[] = []
  const sortedIds = Object.keys(counts).sort((l, r) => counts[r] - counts[l])
  for (const id of sortedIds) {
    const color = paletteById.get(id)
    if (!color) {
      aliases[id] = id
      continue
    }
    const alias = keptIds.find((keptId) => {
      const keptColor = paletteById.get(keptId)
      return keptColor ? deltaE(hexToLab(color.hex), hexToLab(keptColor.hex)) < threshold : false
    })
    aliases[id] = alias ?? id
    if (!alias) {
      keptIds.push(id)
    }
  }
  return aliases
}

/* ------------------------------------------------------------------ *
 * 强制清杂色：把占比 < RARE_COLOR_RATIO 的彩色色号并到最接近的高频色号。
 * 描边色(H9)永远保留。这是“杂色少”的关键一步。
 * ------------------------------------------------------------------ */
function mergeRareColors(ids: Array<string | null>) {
  const counts = new Map<string, number>()
  let total = 0
  for (const id of ids) {
    if (id) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
      total += 1
    }
  }
  if (total === 0) {
    return ids
  }

  const paletteById = new Map(BASIC_BEAD_PALETTE.map((c) => [c.id, c]))
  const keep: string[] = []
  const rare: string[] = []
  for (const [id, count] of counts.entries()) {
    if (id === OUTLINE_COLOR.id || count / total >= RARE_COLOR_RATIO) {
      keep.push(id)
    } else {
      rare.push(id)
    }
  }
  if (rare.length === 0 || keep.length === 0) {
    return ids
  }

  const remap = new Map<string, string>()
  for (const id of rare) {
    const color = paletteById.get(id)
    if (!color) {
      remap.set(id, id)
      continue
    }
    let best = keep[0]
    let bestD = Number.POSITIVE_INFINITY
    for (const k of keep) {
      const kc = paletteById.get(k)
      if (!kc) {
        continue
      }
      const d = deltaE(hexToLab(color.hex), hexToLab(kc.hex))
      if (d < bestD) {
        bestD = d
        best = k
      }
    }
    remap.set(id, best)
  }

  return ids.map((id) => (id && remap.has(id) ? remap.get(id)! : id))
}

/* ------------------------------------------------------------------ *
 * 主流程
 *
 * 描边走像素级独立通道（保持细线不糊），彩色走 k-means 量化 + 每格 snap，
 * 暗色锁中性防串色，最后强制并掉低频杂色。无 SLIC。
 * ------------------------------------------------------------------ */
export async function processImageToPattern(
  imageSrc: string,
  requestedGridSize: number,
  usePalette: boolean,
  options: PatternProcessingOptions = DEFAULT_PATTERN_PROCESSING_OPTIONS,
): Promise<ProcessedPattern> {
  const image = await loadImage(imageSrc)
  const isAuto = options.mode === 'auto'

  const gridSize = isAuto ? recommendGridSize(image) : requestedGridSize
  const { width, height } = getPatternDimensions(image, gridSize)
  const [whiteR, whiteG, whiteB] = hexToRgb(WHITE.hex)

  const sampled = sampleGrid(image, width, height)

  if (!usePalette) {
    const cells: ProcessedPattern['cells'] = sampled.map((cell) =>
      cell ? { r: cell.r, g: cell.g, b: cell.b } : { r: whiteR, g: whiteG, b: whiteB, isEmpty: true },
    )
    return {
      width,
      height,
      cells,
      shoppingList: [],
      recommendation: { gridSize, colorCount: 0 },
    }
  }

  // 分流：描边格（像素级，不进聚类）vs 彩色格
  const idGrid = new Array<string | null>(width * height).fill(null)
  const colorPixels: PixelSample[] = []
  const colorPixelCellIndex: number[] = []

  for (let i = 0; i < sampled.length; i += 1) {
    const cell = sampled[i]
    if (!cell) {
      continue
    }
    if (isOutlinePixel(cell.r, cell.g, cell.b)) {
      idGrid[i] = OUTLINE_COLOR.id
      continue
    }
    colorPixelCellIndex.push(i)
    colorPixels.push(cell)
  }

  // 彩色聚类定代表色
  const useAutoColorCount = isAuto || options.autoRecommendColorCount
  const colorCount = useAutoColorCount
    ? recommendColorCount(colorPixels, AUTO_COLOR_COUNT_MAX)
    : Math.max(2, Math.min(AUTO_COLOR_COUNT_MAX, Math.round(options.targetColorCount)))
  const { assignments, centers } = quantizePixels(colorPixels, colorCount)

  // 每格用所属聚类中心的量化色，逐格 snap（暗色锁中性）
  for (let i = 0; i < colorPixelCellIndex.length; i += 1) {
    const cellIndex = colorPixelCellIndex[i]
    const src = centers[assignments[i]] ?? sampled[cellIndex]!
    const sub = paletteForColor(src.r, src.g, src.b)
    idGrid[cellIndex] = closestColor(src.r, src.g, src.b, sub).id
  }

  // 注：原“保边去杂色”(removeIsolatedNoise) 已移除——它会把眼睛高光、
  // 鼻尖等本就孤立的小细节误判为噪点抹掉，造成糊。杂色由下面的
  // ΔE 合并 + 强制清杂色处理，不需要它。
  let processedIds = idGrid

  // ΔE 合并相近色号
  const mergeSimilar = isAuto ? true : options.mergeSimilarColors
  if (mergeSimilar) {
    const rawCounts: Record<string, number> = {}
    for (const id of processedIds) {
      if (id) {
        rawCounts[id] = (rawCounts[id] ?? 0) + 1
      }
    }
    const aliases = buildColorAliases(rawCounts, BASIC_BEAD_PALETTE, SIMILAR_COLOR_THRESHOLD)
    processedIds = processedIds.map((id) =>
      id && id !== OUTLINE_COLOR.id ? (aliases[id] ?? id) : id,
    )
  }

  // 强制清杂色：并掉低频色号
  if (mergeSimilar) {
    processedIds = mergeRareColors(processedIds)
  }

  // 输出
  const paletteById = new Map(BASIC_BEAD_PALETTE.map((color) => [color.id, color]))
  const counts: Record<string, number> = {}
  const cells: ProcessedPattern['cells'] = []
  for (const id of processedIds) {
    if (id === null) {
      cells.push({ r: whiteR, g: whiteG, b: whiteB, isEmpty: true })
      continue
    }
    const color = paletteById.get(id) ?? WHITE
    const [r, g, b] = hexToRgb(color.hex)
    counts[color.id] = (counts[color.id] ?? 0) + 1
    cells.push({ r, g, b, colorId: color.id })
  }

  const recommendation: PatternRecommendation = {
    gridSize,
    colorCount: Object.keys(counts).length,
  }

  return {
    width,
    height,
    cells,
    shoppingList: buildShoppingList(counts),
    recommendation,
  }
}

/* ------------------------------------------------------------------ *
 * 绘制：空格跳过；白底。
 * ------------------------------------------------------------------ */
export function drawPatternToCanvas(canvas: HTMLCanvasElement, pattern: ProcessedPattern, usePalette: boolean) {
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
      if (cell.isEmpty) {
        continue
      }
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