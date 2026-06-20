import type {
  BeadColor,
  PatternCellEdit,
  PatternAnalysisFeatures,
  PatternExportFormat,
  PatternProcessingOptions,
  PatternSystemRecommendation,
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
  x: number
  y: number
}

type ClusterCenter = {
  r: number
  g: number
  b: number
  lab: Lab
  x: number
  y: number
}

type DetailTuning = {
  blurPasses: number
  opaqueThreshold: number
  highlightVoteRatio: number
  highlightMinContrast: number
  highlightMinBrightnessDelta: number
  smoothingThresholdBias: number
  smoothingProtectionContrast: number
  smoothingProtectionBrightnessDelta: number
  rareColorRatio: number
  minSpatialArea: number
  rareProtectionContrast: number
  rareProtectionMaxArea: number
}

export const DEFAULT_PATTERN_PROCESSING_OPTIONS: PatternProcessingOptions = {
  targetColorCount: 8,
  denoise: true,
  mergeSimilarColors: true,
  preserveDetails: true,
  cleanRareColors: false,
  detailProtectionLevel: 'high',
}

const WHITE = BASIC_BEAD_PALETTE[0]
const PALETTE_BY_ID = new Map(BEAD_PALETTE.map((color) => [color.id, color]))
export const BEAD_DISPLAY_SIZE = 28
const MIN_COLOR_COUNT = 2
const MAX_COLOR_COUNT = 16
const MIN_RECOMMENDED_GRID = 24
const MAX_RECOMMENDED_GRID = 88
const SYSTEM_RECOMMENDATION_BASE_GRID = 56
const SIMILAR_COLOR_THRESHOLD = 5
const SPATIAL_CLUSTER_WEIGHT = 0.03
const EXPORT_MIME_TYPE: Record<PatternExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

const SUPERSAMPLE = 4

// 描边像素级判定（独立通道，不参与彩色聚类，保持细线不糊）
const OUTLINE_MAX_BRIGHTNESS = 58
const OUTLINE_MAX_CHROMA = 26
const OUTLINE_FORCE_BRIGHTNESS = 28
const OUTLINE_NEUTRAL_DISTANCE = 8.5

// 暗 + 低彩度只 snap 中性色
const NEUTRAL_LOCK_BRIGHTNESS = 95
const NEUTRAL_LOCK_CHROMA = 35
const NEUTRAL_PALETTE_CHROMA = 30

// 强制清杂色：占比低于此阈值的色号并到最接近的保留色（仅推荐/合并模式）
const RARE_COLOR_RATIO = 0.025

// 空间感知：稀有色若存在 ≥ 此面积的连通块，视为“有意义的区域细节”，不合并
const MIN_SPATIAL_AREA = 3

const OUTLINE_COLOR: BeadColor =
  BASIC_BEAD_PALETTE.find((c) => c.id === 'H9') ??
  [...BASIC_BEAD_PALETTE].sort((a, b) => brightnessOfHex(a.hex) - brightnessOfHex(b.hex))[0]

const OUTLINE_REFERENCE_COLORS = ['H9', 'H23', 'H13', 'H8']
  .map((id) => BASIC_BEAD_PALETTE.find((color) => color.id === id))
  .filter((color): color is BeadColor => Boolean(color))
const OUTLINE_REFERENCE_LABS = OUTLINE_REFERENCE_COLORS.map((color) => hexToLab(color.hex))

const NEUTRAL_PALETTE: BeadColor[] = BASIC_BEAD_PALETTE.filter((c) => {
  const [r, g, b] = hexToRgb(c.hex)
  return (Math.max(r, g, b) - Math.min(r, g, b)) < NEUTRAL_PALETTE_CHROMA
})

const DETAIL_TUNING: Record<PatternProcessingOptions['detailProtectionLevel'], DetailTuning> = {
  low: {
    blurPasses: 1,
    opaqueThreshold: 0.5,
    highlightVoteRatio: 0.95,
    highlightMinContrast: 24,
    highlightMinBrightnessDelta: 28,
    smoothingThresholdBias: -1,
    smoothingProtectionContrast: 20,
    smoothingProtectionBrightnessDelta: 24,
    rareColorRatio: RARE_COLOR_RATIO,
    minSpatialArea: MIN_SPATIAL_AREA,
    rareProtectionContrast: 18,
    rareProtectionMaxArea: 1,
  },
  medium: {
    blurPasses: 0,
    opaqueThreshold: 0.4,
    highlightVoteRatio: 0.75,
    highlightMinContrast: 18,
    highlightMinBrightnessDelta: 18,
    smoothingThresholdBias: 0,
    smoothingProtectionContrast: 14,
    smoothingProtectionBrightnessDelta: 14,
    rareColorRatio: 0.018,
    minSpatialArea: 2,
    rareProtectionContrast: 14,
    rareProtectionMaxArea: 2,
  },
  high: {
    blurPasses: 0,
    opaqueThreshold: 0.34,
    highlightVoteRatio: 0.6,
    highlightMinContrast: 14,
    highlightMinBrightnessDelta: 12,
    smoothingThresholdBias: 1,
    smoothingProtectionContrast: 10,
    smoothingProtectionBrightnessDelta: 10,
    rareColorRatio: 0.012,
    minSpatialArea: 2,
    rareProtectionContrast: 10,
    rareProtectionMaxArea: 2,
  },
}

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

function clampDetailProtectionLevel(level: PatternProcessingOptions['detailProtectionLevel'] | undefined) {
  if (level === 'low' || level === 'medium' || level === 'high') {
    return level
  }
  return DEFAULT_PATTERN_PROCESSING_OPTIONS.detailProtectionLevel
}

export function normalizePatternProcessingOptions(
  options: Partial<PatternProcessingOptions> = {},
): PatternProcessingOptions {
  return {
    ...DEFAULT_PATTERN_PROCESSING_OPTIONS,
    ...options,
    targetColorCount: clampColorCount(options.targetColorCount ?? DEFAULT_PATTERN_PROCESSING_OPTIONS.targetColorCount),
    preserveDetails: options.preserveDetails ?? DEFAULT_PATTERN_PROCESSING_OPTIONS.preserveDetails,
    cleanRareColors: options.cleanRareColors ?? DEFAULT_PATTERN_PROCESSING_OPTIONS.cleanRareColors,
    detailProtectionLevel: clampDetailProtectionLevel(options.detailProtectionLevel),
  }
}

function getDetailTuning(options: PatternProcessingOptions): DetailTuning {
  const base = DETAIL_TUNING[options.detailProtectionLevel]
  if (options.preserveDetails) {
    return base
  }

  return {
    ...DETAIL_TUNING.low,
    blurPasses: Math.max(1, DETAIL_TUNING.low.blurPasses),
    opaqueThreshold: 0.5,
    highlightVoteRatio: 1,
    smoothingThresholdBias: -1,
    rareColorRatio: RARE_COLOR_RATIO,
    minSpatialArea: MIN_SPATIAL_AREA,
    rareProtectionContrast: Number.POSITIVE_INFINITY,
    rareProtectionMaxArea: 0,
  }
}

function minDeltaEToOutline(r: number, g: number, b: number) {
  const sourceLab = rgbToLab([r, g, b])
  let best = Number.POSITIVE_INFINITY
  for (const outlineLab of OUTLINE_REFERENCE_LABS) {
    best = Math.min(best, deltaE(sourceLab, outlineLab))
  }
  return best
}

function colorDistanceById(leftId: string, rightId: string) {
  const left = PALETTE_BY_ID.get(leftId)
  const right = PALETTE_BY_ID.get(rightId)
  if (!left || !right) {
    return 0
  }
  return deltaE(hexToLab(left.hex), hexToLab(right.hex))
}
/* ------------------------------------------------------------------ *
 * 3x3 盒式模糊：抑制 JPEG 伪影与传感器噪点，避免被误判为细节。
 * 仅用于降采样画布，不影响原图。
 * ------------------------------------------------------------------ */
function blurCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, passes = 1) {
  if (w < 3 || h < 3 || passes < 1) {
    return
  }

  for (let pass = 0; pass < passes; pass += 1) {
    const imageData = ctx.getImageData(0, 0, w, h)
    const src = new Uint8ClampedArray(imageData.data)
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const idx = (y * w + x) * 4
        for (let c = 0; c < 3; c += 1) {
          let sum = 0
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              sum += src[((y + dy) * w + (x + dx)) * 4 + c]
            }
          }
          imageData.data[idx + c] = Math.round(sum / 9)
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }
}

function isOutlinePixel(r: number, g: number, b: number) {
  const brightness = brightnessOf(r, g, b)
  const chroma = chromaOf(r, g, b)
  if (brightness > OUTLINE_MAX_BRIGHTNESS || chroma > OUTLINE_MAX_CHROMA) {
    return false
  }

  const neutralDistance = minDeltaEToOutline(r, g, b)
  if (brightness <= OUTLINE_FORCE_BRIGHTNESS) {
    return neutralDistance <= OUTLINE_NEUTRAL_DISTANCE + 1.5
  }
  return neutralDistance <= OUTLINE_NEUTRAL_DISTANCE
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
      color: PALETTE_BY_ID.get(id) ?? WHITE,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

export function updatePatternCellColor(
  pattern: ProcessedPattern,
  cellIndex: number,
  colorId: string,
): ProcessedPattern {
  return applyPatternCellEdits(pattern, [
    {
      x: cellIndex % pattern.width,
      y: Math.floor(cellIndex / pattern.width),
      colorId,
      reason: '手动修改当前拼豆颜色。',
    },
  ])
}

export function applyPatternCellEdits(
  pattern: ProcessedPattern,
  edits: PatternCellEdit[],
): ProcessedPattern {
  if (edits.length === 0) {
    return pattern
  }

  const cells = [...pattern.cells]
  let changed = false

  for (const edit of edits) {
    const color = PALETTE_BY_ID.get(edit.colorId)
    if (!color) {
      continue
    }
    const x = Math.max(0, Math.min(pattern.width - 1, Math.round(edit.x)))
    const y = Math.max(0, Math.min(pattern.height - 1, Math.round(edit.y)))
    const cellIndex = (y * pattern.width) + x
    const currentCell = cells[cellIndex]
    if (!currentCell || currentCell.isEmpty || currentCell.colorId === color.id) {
      continue
    }

    const [r, g, b] = hexToRgb(color.hex)
    cells[cellIndex] = {
      r,
      g,
      b,
      colorId: color.id,
    }
    changed = true
  }

  if (!changed) {
    return pattern
  }

  const counts: Record<string, number> = {}
  const ids = cells.map((cell) => (cell.isEmpty ? null : (cell.colorId ?? null)))
  for (const cell of cells) {
    if (!cell.isEmpty && cell.colorId) {
      counts[cell.colorId] = (counts[cell.colorId] ?? 0) + 1
    }
  }

  return {
    ...pattern,
    cells,
    shoppingList: buildShoppingList(counts),
    analysisFeatures: buildPatternAnalysisFeatures(ids, pattern.width, pattern.height, counts),
  }
}

export function buildSystemPatternRecommendation(
  pattern: ProcessedPattern,
): PatternSystemRecommendation {
  const features = pattern.analysisFeatures
  const reasons: string[] = []
  let recommendedGridSize = pattern.width >= pattern.height ? pattern.width : pattern.height

  if (features.detailDensityScore >= 0.62) {
    recommendedGridSize += 8
    reasons.push('当前图案细节密度偏高，建议适度加大网格以保住局部结构。')
  } else if (features.detailDensityScore >= 0.48) {
    recommendedGridSize += 4
    reasons.push('图案细节较多，适合略微提高网格尺寸。')
  } else if (features.detailDensityScore <= 0.24) {
    recommendedGridSize -= 6
    reasons.push('图案整体变化较平缓，可适度降低网格，减少制作复杂度。')
  }

  if (features.edgeFillRatio > 0.72) {
    recommendedGridSize -= 2
    reasons.push('主体贴边较明显，略微收紧网格有助于保留整体留白。')
  }

  const totalCount = pattern.shoppingList.reduce((sum, item) => sum + item.count, 0)
  const dominantColorCount = pattern.shoppingList.filter((item) => (
    totalCount > 0 && (item.count / totalCount) >= 0.05
  )).length
  const mediumColorCount = pattern.shoppingList.filter((item) => (
    totalCount > 0 && (item.count / totalCount) >= 0.025
  )).length

  const recommendedTargetColorCount = clampColorCount(
    Math.max(
      dominantColorCount,
      Math.min(
        14,
        Math.round(
          mediumColorCount
          + (features.detailDensityScore > 0.58 ? 1 : 0)
          + (features.outlineColorRatio > 0.04 ? 1 : 0),
        ),
      ),
    ),
  )

  if (recommendedTargetColorCount >= mediumColorCount) {
    reasons.push('推荐配色数会优先保留占比较大的主色，避免主体颜色被误删。')
  }

  const recommendedOptions = normalizePatternProcessingOptions({
    targetColorCount: recommendedTargetColorCount,
    denoise: features.detailDensityScore < 0.72,
    mergeSimilarColors: features.uniqueColorCount >= 12,
    preserveDetails: features.detailDensityScore >= 0.34 || features.outlineColorRatio > 0.05,
    cleanRareColors: false,
    detailProtectionLevel: features.detailDensityScore >= 0.6
      ? 'high'
      : features.detailDensityScore >= 0.38
        ? 'medium'
        : 'low',
  })

  if (recommendedOptions.preserveDetails) {
    reasons.push('当前图案存在边缘或高频细节，建议保留细节。')
  }
  if (!recommendedOptions.cleanRareColors) {
    reasons.push('系统推荐默认不启用稀有色清理，避免误伤占比较大的有效主色。')
  }

  const finalGridSize = clampGridSize(recommendedGridSize)
  return {
    gridSize: finalGridSize,
    processingOptions: recommendedOptions,
    summary: '根据当前图纸结构、色彩分布和细节密度生成系统算法推荐设置。',
    reasons: Array.from(new Set(reasons)).slice(0, 4),
  }
}

export async function buildSystemPatternRecommendationFromImage(imageSrc: string): Promise<PatternSystemRecommendation> {
  const basePattern = await processImageToPattern(
    imageSrc,
    SYSTEM_RECOMMENDATION_BASE_GRID,
    true,
    DEFAULT_PATTERN_PROCESSING_OPTIONS,
  )
  return buildSystemPatternRecommendation(basePattern)
}

function distanceSquared(color1: Lab, color2: Lab) {
  return (
    (color1.l - color2.l) ** 2 +
    (color1.a - color2.a) ** 2 +
    (color1.b - color2.b) ** 2
  )
}

function clusterDistance(pixel: PixelSample, center: ClusterCenter) {
  const colorDistance = distanceSquared(pixel.lab, center.lab)
  const spatialDistance = ((pixel.x - center.x) ** 2) + ((pixel.y - center.y) ** 2)
  return colorDistance + (SPATIAL_CLUSTER_WEIGHT * spatialDistance)
}

/* ------------------------------------------------------------------ *
 * 降采样 + 每格主色采样
 * ------------------------------------------------------------------ */
function sampleGrid(
  image: HTMLImageElement,
  width: number,
  height: number,
  options: PatternProcessingOptions,
) {
  const tuning = getDetailTuning(options)
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
  blurCanvas(ctx, superW, superH, tuning.blurPasses)
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
      if (opaque < Math.ceil((SUPERSAMPLE * SUPERSAMPLE) * tuning.opaqueThreshold)) {
        cells[(gy * width) + gx] = null
        continue
      }
      const entries = Array.from(bucket.values())
      entries.sort((left, right) => {
        const leftWeight = left.count + (left.outline ? 0.25 : 0)
        const rightWeight = right.count + (right.outline ? 0.25 : 0)
        return rightWeight - leftWeight
      })

      let best = entries[0] ?? null
      const runnerUp = entries[1] ?? null
      if (!best) {
        cells[(gy * width) + gx] = null
        continue
      }
      if (options.preserveDetails && runnerUp && !best.outline && !runnerUp.outline) {
        const bestBrightness = brightnessOf(best.r / best.count, best.g / best.count, best.b / best.count)
        const runnerUpBrightness = brightnessOf(
          runnerUp.r / runnerUp.count,
          runnerUp.g / runnerUp.count,
          runnerUp.b / runnerUp.count,
        )
        const contrast = deltaE(
          rgbToLab([
            Math.round(best.r / best.count),
            Math.round(best.g / best.count),
            Math.round(best.b / best.count),
          ]),
          rgbToLab([
            Math.round(runnerUp.r / runnerUp.count),
            Math.round(runnerUp.g / runnerUp.count),
            Math.round(runnerUp.b / runnerUp.count),
          ]),
        )

        const isRunnerUpHighlight =
          runnerUp.count >= Math.max(1, Math.ceil(best.count * tuning.highlightVoteRatio)) &&
          runnerUpBrightness - bestBrightness >= tuning.highlightMinBrightnessDelta &&
          contrast >= tuning.highlightMinContrast

        if (isRunnerUpHighlight) {
          best = runnerUp
        }
      }
      const r = Math.round(best.r / best.count)
      const g = Math.round(best.g / best.count)
      const b = Math.round(best.b / best.count)
      cells[(gy * width) + gx] = {
        r,
        g,
        b,
        lab: rgbToLab([r, g, b]),
        x: gx,
        y: gy,
      }
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
        minDistance = Math.min(minDistance, clusterDistance(pixel, center))
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
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const next = centers.map(() => ({ count: 0, r: 0, g: 0, b: 0, l: 0, a: 0, labB: 0, x: 0, y: 0 }))
    let changed = false
    for (let i = 0; i < pixels.length; i += 1) {
      const pixel = pixels[i]
      let bestIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY
      for (let c = 0; c < centers.length; c += 1) {
        const distance = clusterDistance(pixel, centers[c])
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
      bucket.x += pixel.x
      bucket.y += pixel.y
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
        x: bucket.x / bucket.count,
        y: bucket.y / bucket.count,
      }
    })
    if (!changed && iteration > 0) {
      break
    }
  }
  return { assignments, centers }
}

function clampColorCount(value: number) {
  return Math.max(MIN_COLOR_COUNT, Math.min(MAX_COLOR_COUNT, Math.round(value)))
}

function clampGridSize(value: number) {
  return Math.max(MIN_RECOMMENDED_GRID, Math.min(MAX_RECOMMENDED_GRID, Math.round(value)))
}

/* ------------------------------------------------------------------ *
 * 邻域一致性平滑：消除孤立噪点，保持区域连贯。
 * 条件：当前格无同色邻居 且 邻域主色出现次数 ≥ 阈值。
 * 描边色格(H9)不参与翻转，保证细线不糊。
 * ------------------------------------------------------------------ */
function neighborhoodSmooth(
  idGrid: (string | null)[],
  width: number,
  height: number,
  options: PatternProcessingOptions,
  passes = 1,
): (string | null)[] {
  if (width < 2 || height < 2 || passes < 1) {
    return idGrid
  }
  const tuning = getDetailTuning(options)
  let source = idGrid
  let result = idGrid
  for (let pass = 0; pass < passes; pass += 1) {
    const smoothed = [...source]
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x
        const currentColor = source[idx]
        if (!currentColor || currentColor === OUTLINE_COLOR.id) {
          continue
        }
        // 收集邻域颜色频次（不含自身）
        const neighborCounts = new Map<string, number>()
        let validNeighbors = 0
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
            const nColor = source[ny * width + nx]
            if (nColor) {
              validNeighbors += 1
              neighborCounts.set(nColor, (neighborCounts.get(nColor) ?? 0) + 1)
            }
          }
        }
        if (validNeighbors === 0) {
          continue
        }
        // 当前色在邻域中出现次数
        const sameColorCount = neighborCounts.get(currentColor) ?? 0
        if (sameColorCount > 0) {
          continue
        }
        // 找出邻域主色
        let bestColor: string | null = null
        let bestCount = 0
        for (const [color, count] of neighborCounts) {
          if (count > bestCount) {
            bestCount = count
            bestColor = color
          }
        }
        // 阈值：角落≥2，边缘≥3，内部≥4
        const baseThreshold = validNeighbors <= 3 ? 2 : validNeighbors <= 5 ? 3 : 4
        const threshold = Math.max(2, baseThreshold - tuning.smoothingThresholdBias)
        if (bestColor && options.preserveDetails) {
          const contrast = colorDistanceById(currentColor, bestColor)
          const brightnessDelta =
            brightnessOfHex((PALETTE_BY_ID.get(currentColor) ?? WHITE).hex) -
            brightnessOfHex((PALETTE_BY_ID.get(bestColor) ?? WHITE).hex)
          if (
            contrast >= tuning.smoothingProtectionContrast &&
            brightnessDelta >= tuning.smoothingProtectionBrightnessDelta
          ) {
            continue
          }
        }
        if (bestColor && bestCount >= threshold) {
          smoothed[idx] = bestColor
        }
      }
    }
    source = smoothed
    result = smoothed
  }
  return result
}

/* ------------------------------------------------------------------ *
 * 连通分量分析：BFS 求每种颜色所有连通块面积。
 * 用于判断“稀有色”是否形成空间连贯区域。
 * ------------------------------------------------------------------ */
function getConnectedComponentAreas(
  idGrid: (string | null)[],
  width: number,
  height: number,
): Map<string, number[]> {
  const visited = new Uint8Array(width * height)
  const areas = new Map<string, number[]>()
  const dirs = [0, -1, 0, 1, 0] // 4-connected: up, right, down, left

  for (let startY = 0; startY < height; startY += 1) {
    for (let startX = 0; startX < width; startX += 1) {
      const startIdx = startY * width + startX
      if (visited[startIdx]) continue
      const color = idGrid[startIdx]
      if (!color) {
        visited[startIdx] = 1
        continue
      }
      // BFS
      const queue: number[] = [startIdx]
      visited[startIdx] = 1
      let area = 0
      while (queue.length > 0) {
        const idx = queue.pop()!
        area += 1
        const cx = idx % width
        const cy = Math.floor(idx / width)
        for (let d = 0; d < 4; d += 1) {
          const nx = cx + dirs[d]
          const ny = cy + dirs[d + 1]
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const nIdx = ny * width + nx
          if (visited[nIdx]) continue
          if (idGrid[nIdx] !== color) continue
          visited[nIdx] = 1
          queue.push(nIdx)
        }
      }
      if (area > 0) {
        const list = areas.get(color)
        if (list) {
          list.push(area)
        } else {
          areas.set(color, [area])
        }
      }
    }
  }
  // 每个颜色的连通块面积按降序排列
  for (const list of areas.values()) {
    list.sort((a, b) => b - a)
  }
  return areas
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
 * 描边色(H9)永远保留。
 * 空间感知：若稀有色在某处形成 ≥ MIN_SPATIAL_AREA 的连通块，
 * 说明它是“有意义的区域细节”（如眼睛高光、鼻尖），予以保留。
 * ------------------------------------------------------------------ */
function mergeRareColors(
  ids: Array<string | null>,
  width: number,
  height: number,
  options: PatternProcessingOptions,
) {
  const tuning = getDetailTuning(options)
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

  // 先计算连通分量，用于空间感知判断
  const componentAreas = getConnectedComponentAreas(ids, width, height)

  for (const [id, count] of counts.entries()) {
    if (id === OUTLINE_COLOR.id) {
      keep.push(id)
      continue
    }
    const ratio = count / total
    if (ratio >= tuning.rareColorRatio) {
      keep.push(id)
      continue
    }
    // 空间感知：检查该色是否形成有意义的连贯区域
    const areas = componentAreas.get(id)
    const largestArea = areas?.[0] ?? 0
    if (largestArea >= tuning.minSpatialArea) {
      keep.push(id)
      continue
    }
    if (options.preserveDetails && largestArea > 0 && largestArea <= tuning.rareProtectionMaxArea) {
      const nearestKeptDistance = keep.reduce((best, keptId) => (
        Math.min(best, colorDistanceById(id, keptId))
      ), Number.POSITIVE_INFINITY)
      if (nearestKeptDistance >= tuning.rareProtectionContrast) {
        keep.push(id)
        continue
      }
    }
    rare.push(id)
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

function buildPatternAnalysisFeatures(
  ids: (string | null)[],
  width: number,
  height: number,
  counts: Record<string, number>,
): PatternAnalysisFeatures {
  const totalCells = width * height
  const filledCells = ids.reduce((sum, id) => sum + (id ? 1 : 0), 0)
  const emptyCellRatio = totalCells === 0 ? 0 : (totalCells - filledCells) / totalCells
  const filledCellRatio = totalCells === 0 ? 0 : filledCells / totalCells
  let edgeCells = 0
  let edgeFilled = 0
  let leftCount = 0
  let rightCount = 0
  let topCount = 0
  let bottomCount = 0
  let horizontalPairs = 0
  let verticalPairs = 0
  let horizontalTransitions = 0
  let verticalTransitions = 0
  let contrastTotal = 0
  let contrastPairs = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width) + x
      const currentId = ids[idx]
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (isEdge) {
        edgeCells += 1
        if (currentId) {
          edgeFilled += 1
        }
      }
      if (!currentId) {
        continue
      }

      if (x < width / 2) {
        leftCount += 1
      } else {
        rightCount += 1
      }
      if (y < height / 2) {
        topCount += 1
      } else {
        bottomCount += 1
      }

      if (x < width - 1) {
        const rightId = ids[idx + 1]
        if (rightId) {
          horizontalPairs += 1
          contrastTotal += colorDistanceById(currentId, rightId)
          contrastPairs += 1
          if (rightId !== currentId) {
            horizontalTransitions += 1
          }
        }
      }

      if (y < height - 1) {
        const bottomId = ids[idx + width]
        if (bottomId) {
          verticalPairs += 1
          contrastTotal += colorDistanceById(currentId, bottomId)
          contrastPairs += 1
          if (bottomId !== currentId) {
            verticalTransitions += 1
          }
        }
      }
    }
  }

  const countValues = Object.values(counts)
  const dominantColorShare = filledCells === 0 ? 0 : (Math.max(...countValues, 0) / filledCells)
  const rareCellCount = countValues.reduce((sum, count) => (
    sum + ((filledCells > 0 && (count / filledCells) <= 0.03) ? count : 0)
  ), 0)
  const averageNeighborContrast = contrastPairs === 0 ? 0 : contrastTotal / contrastPairs
  const horizontalTransitionRatio = horizontalPairs === 0 ? 0 : horizontalTransitions / horizontalPairs
  const verticalTransitionRatio = verticalPairs === 0 ? 0 : verticalTransitions / verticalPairs
  const detailDensityScore = Math.min(
    1,
    ((horizontalTransitionRatio + verticalTransitionRatio) / 2) + Math.min(averageNeighborContrast / 20, 0.35),
  )

  const notes: string[] = []
  if (edgeCells > 0 && (edgeFilled / edgeCells) > 0.7) {
    notes.push('边缘区域占用偏高，主体可能过于贴边。')
  }
  if (dominantColorShare > 0.45) {
    notes.push('主导色占比偏高，颜色分布可能失衡。')
  }
  if (averageNeighborContrast < 3) {
    notes.push('相邻色差偏低，图案层次可能不足。')
  }
  if (detailDensityScore > 0.68) {
    notes.push('局部色块变化较密集，可能存在噪点或细节堆叠。')
  }

  return {
    gridWidth: width,
    gridHeight: height,
    totalCells,
    filledCellRatio,
    emptyCellRatio,
    edgeFillRatio: edgeCells === 0 ? 0 : edgeFilled / edgeCells,
    leftRightBalanceDelta: filledCells === 0 ? 0 : Math.abs(leftCount - rightCount) / filledCells,
    topBottomBalanceDelta: filledCells === 0 ? 0 : Math.abs(topCount - bottomCount) / filledCells,
    dominantColorShare,
    rareColorRatio: filledCells === 0 ? 0 : rareCellCount / filledCells,
    uniqueColorCount: countValues.length,
    outlineColorRatio: filledCells === 0 ? 0 : ((counts[OUTLINE_COLOR.id] ?? 0) / filledCells),
    horizontalTransitionRatio,
    verticalTransitionRatio,
    averageNeighborContrast,
    detailDensityScore,
    notes,
  }
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
  const resolvedOptions = normalizePatternProcessingOptions(options)
  const image = await loadImage(imageSrc)
  const gridSize = requestedGridSize
  const { width, height } = getPatternDimensions(image, gridSize)
  const [whiteR, whiteG, whiteB] = hexToRgb(WHITE.hex)

  const sampled = sampleGrid(image, width, height, resolvedOptions)

  if (!usePalette) {
    const cells: ProcessedPattern['cells'] = sampled.map((cell) =>
      cell ? { r: cell.r, g: cell.g, b: cell.b } : { r: whiteR, g: whiteG, b: whiteB, isEmpty: true },
    )
    return {
      width,
      height,
      cells,
      shoppingList: [],
      analysisFeatures: buildPatternAnalysisFeatures(
        new Array(width * height).fill(null),
        width,
        height,
        {},
      ),
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
  const colorCount = clampColorCount(resolvedOptions.targetColorCount)
  const { assignments, centers } = quantizePixels(colorPixels, colorCount)

  // 每格用所属聚类中心的量化色，逐格 snap（暗色锁中性）
  for (let i = 0; i < colorPixelCellIndex.length; i += 1) {
    const cellIndex = colorPixelCellIndex[i]
    const src = centers[assignments[i]] ?? sampled[cellIndex]!
    const sub = paletteForColor(src.r, src.g, src.b)
    idGrid[cellIndex] = closestColor(src.r, src.g, src.b, sub).id
  }

  // 邻域一致性平滑：消孤立噪点，保留描边色。
  // auto 模式默认开启；manual 模式由 denoise 开关控制。
  let processedIds = idGrid
  const shouldDenoise = resolvedOptions.denoise
  if (shouldDenoise) {
    processedIds = neighborhoodSmooth(processedIds, width, height, resolvedOptions)
  }

  // ΔE 合并相近色号
  const mergeSimilar = resolvedOptions.mergeSimilarColors
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
  if (resolvedOptions.cleanRareColors) {
    processedIds = mergeRareColors(processedIds, width, height, resolvedOptions)
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

  return {
    width,
    height,
    cells,
    shoppingList: buildShoppingList(counts),
    analysisFeatures: buildPatternAnalysisFeatures(processedIds, width, height, counts),
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

export async function exportPatternImage(
  pattern: ProcessedPattern,
  format: PatternExportFormat,
) {
  if (typeof document === 'undefined') {
    throw new Error('当前环境不支持导出图纸，请在浏览器中重试。')
  }

  if (!pattern || pattern.cells.length === 0) {
    throw new Error('当前没有可导出的图纸数据，请先生成拼豆图纸。')
  }

  const canvas = document.createElement('canvas')
  drawPatternToCanvas(canvas, pattern, true)

  const mimeType = EXPORT_MIME_TYPE[format]
  const quality = format === 'png' ? undefined : 1
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('导出文件生成失败，请稍后重试。'))
          return
        }
        resolve(result)
      },
      mimeType,
      quality,
    )
  })

  const extension = format === 'jpeg' ? 'jpg' : format
  const downloadUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.download = `PlankBean-拼豆图纸.${extension}`
    link.href = downloadUrl
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
  }
}

export const __PATTERN_TESTING__ = {
  isOutlinePixel,
  mergeRareColors,
  neighborhoodSmooth,
  normalizePatternProcessingOptions,
}
