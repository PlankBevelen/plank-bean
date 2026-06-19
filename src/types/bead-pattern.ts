export type BeadColor = {
  hex: string
  name: string
  id: string
}

export type PatternColorMode = 'basic'
export type PatternExportFormat = 'png' | 'jpeg' | 'webp'

// 处理模式：auto = 推荐模式（全自动），manual = 手动微调
export type PatternMode = 'auto' | 'manual'
export type DetailProtectionLevel = 'low' | 'medium' | 'high'

export type PatternProcessingOptions = {
  mode: PatternMode
  targetColorCount: number
  autoRecommendColorCount: boolean
  denoise: boolean
  mergeSimilarColors: boolean
  preserveDetails: boolean
  cleanRareColors: boolean
  detailProtectionLevel: DetailProtectionLevel
}

export type ShoppingListItem = {
  color: BeadColor
  count: number
}

export type PatternCell = {
  r: number
  g: number
  b: number
  colorId?: string
  // 背景 / 透明格：绘制时跳过，不计入购物单
  isEmpty?: boolean
}

// 推荐模式下，处理流程实际采用的参数，回传给 UI 展示
export type PatternRecommendation = {
  gridSize: number
  colorCount: number
}

export type ProcessedPattern = {
  width: number
  height: number
  cells: PatternCell[]
  shoppingList: ShoppingListItem[]
  // 实际生效的推荐参数（推荐模式时由算法决定，手动模式回显当前值）
  recommendation: PatternRecommendation
}
