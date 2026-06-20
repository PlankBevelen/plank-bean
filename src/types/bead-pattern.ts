export type BeadColor = {
  hex: string
  name: string
  id: string
}

export type PatternColorMode = 'basic'
export type PatternExportFormat = 'png' | 'jpeg' | 'webp'

export type DetailProtectionLevel = 'low' | 'medium' | 'high'
export type PatternParameterMode = 'recommended' | 'manual'

export type PatternProcessingOptions = {
  targetColorCount: number
  denoise: boolean
  mergeSimilarColors: boolean
  preserveDetails: boolean
  cleanRareColors: boolean
  detailProtectionLevel: DetailProtectionLevel
}

export type PatternAnalysisFeatures = {
  gridWidth: number
  gridHeight: number
  totalCells: number
  filledCellRatio: number
  emptyCellRatio: number
  edgeFillRatio: number
  leftRightBalanceDelta: number
  topBottomBalanceDelta: number
  dominantColorShare: number
  rareColorRatio: number
  uniqueColorCount: number
  outlineColorRatio: number
  horizontalTransitionRatio: number
  verticalTransitionRatio: number
  averageNeighborContrast: number
  detailDensityScore: number
  notes: string[]
}

export type PatternParameterPatch = {
  gridSize?: number
  processingOptions?: Partial<PatternProcessingOptions>
}

export type PatternCellEdit = {
  x: number
  y: number
  colorId: string
  reason: string
}

export type PatternSystemRecommendation = {
  gridSize: number
  processingOptions: PatternProcessingOptions
  summary: string
  reasons: string[]
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

export type ProcessedPattern = {
  width: number
  height: number
  cells: PatternCell[]
  shoppingList: ShoppingListItem[]
  analysisFeatures: PatternAnalysisFeatures
}
