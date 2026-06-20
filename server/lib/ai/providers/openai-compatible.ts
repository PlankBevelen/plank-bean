import type { AIProvider, AIProviderContext } from '../types'
import type {
  AIAnalysisResult,
  AIAnomalyItem,
  AIAnomalySeverity,
  AIAnomalyType,
  AIOptimizationOption,
  AnalyzeTaskInput,
  PatternCellEdit,
  PatternParameterPatch,
} from '../../../types/ai-task'

type DetailProtectionLevel = AnalyzeTaskInput['processingOptions']['detailProtectionLevel']

type ResponsesApiResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string | { value?: string }
    }>
  }>
  error?: {
    message?: string
  }
}

function extractTextValue(text: string | { value?: string } | undefined) {
  if (typeof text === 'string') {
    return text
  }
  return text?.value ?? ''
}

function extractTextContent(payload: ResponsesApiResponse) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  if (Array.isArray(payload.output)) {
    const text = payload.output
      .flatMap((item) => item.content ?? [])
      .map((item) => extractTextValue(item.text))
      .join('')
      .trim()

    if (text) {
      return text
    }
  }

  if (payload.error?.message) {
    throw new Error(payload.error.message)
  }

  throw new Error('AI 响应内容为空')
}

function parseJson<T>(raw: string): T {
  const normalized = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  return JSON.parse(normalized) as T
}

function normalizeNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[；;。.!？?\n]/)
      .map((item) => item.replace(/^[-*\d\s、.]+/, '').trim())
      .filter(Boolean)
  }
  return []
}

function normalizeDetailLevel(value: unknown, fallback: DetailProtectionLevel = 'medium'): DetailProtectionLevel {
  return value === 'low' || value === 'medium' || value === 'high' ? value : fallback
}

function normalizeAnomalyType(value: unknown): AIAnomalyType {
  return value === 'layout' || value === 'color-balance' || value === 'fidelity'
    ? value
    : 'layout'
}

function normalizeAnomalySeverity(value: unknown): AIAnomalySeverity {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium'
}

function normalizePatch(value: unknown, input: AnalyzeTaskInput): PatternParameterPatch {
  const record = (value && typeof value === 'object') ? value as Record<string, unknown> : {}
  const processingOptions = (record.processingOptions && typeof record.processingOptions === 'object')
    ? record.processingOptions as Record<string, unknown>
    : {}

  return {
    gridSize: record.gridSize === undefined ? undefined : normalizeNumber(record.gridSize, input.gridSize),
    processingOptions: {
      targetColorCount: processingOptions.targetColorCount === undefined
        ? undefined
        : Math.max(2, Math.min(16, normalizeNumber(processingOptions.targetColorCount, input.processingOptions.targetColorCount))),
      denoise: processingOptions.denoise === undefined
        ? undefined
        : Boolean(processingOptions.denoise),
      mergeSimilarColors: processingOptions.mergeSimilarColors === undefined
        ? undefined
        : Boolean(processingOptions.mergeSimilarColors),
      preserveDetails: processingOptions.preserveDetails === undefined
        ? undefined
        : Boolean(processingOptions.preserveDetails),
      cleanRareColors: processingOptions.cleanRareColors === undefined
        ? undefined
        : Boolean(processingOptions.cleanRareColors),
      detailProtectionLevel: processingOptions.detailProtectionLevel === undefined
        ? undefined
        : normalizeDetailLevel(processingOptions.detailProtectionLevel, input.processingOptions.detailProtectionLevel),
    },
  }
}

function normalizeCellEdits(value: unknown, input: AnalyzeTaskInput): PatternCellEdit[] {
  if (!Array.isArray(value) || !input.patternSnapshot) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const record = item as Record<string, unknown>
      return {
        x: Math.max(0, Math.min(input.patternSnapshot!.width - 1, Math.round(normalizeNumber(record.x, 0)))),
        y: Math.max(0, Math.min(input.patternSnapshot!.height - 1, Math.round(normalizeNumber(record.y, 0)))),
        colorId: normalizeString(record.colorId, ''),
        reason: normalizeString(record.reason, '修正局部拼豆异常。'),
      }
    })
    .filter((item): item is PatternCellEdit => Boolean(item?.colorId))
    .slice(0, 12)
}

function normalizeAnomalyItem(item: unknown, index: number): AIAnomalyItem | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const record = item as Record<string, unknown>
  return {
    id: normalizeString(record.id, `anomaly-${index + 1}`),
    type: normalizeAnomalyType(record.type),
    title: normalizeString(record.title, `异常 ${index + 1}`),
    severity: normalizeAnomalySeverity(record.severity),
    description: normalizeString(record.description, '检测到当前图纸存在需要调整的问题。'),
    impact: normalizeString(record.impact, '可能影响图纸的视觉平衡和可制作性。'),
    evidence: normalizeString(record.evidence, '基于当前参数和图纸分析摘要推断。'),
  }
}

function buildFallbackOptions(input: AnalyzeTaskInput): AIOptimizationOption[] {
  const directFixEdits = buildFallbackCellEdits(input)
  return [
    {
      id: 'option-balance-1',
      title: '平衡细节保留',
      summary: '优先保住主体轮廓和主要配色层次。',
      targetAnomalyIds: ['anomaly-1'],
      patch: {
        processingOptions: {
          preserveDetails: true,
          detailProtectionLevel: 'high',
          denoise: false,
        },
      },
      cellEdits: directFixEdits.slice(0, 3),
      expectedBenefits: ['减少主体边缘被抹平的风险', '提升图案还原度'],
      risks: ['图纸可能保留更多细碎色块'],
      beforeSummary: `当前网格 ${input.gridSize}，目标配色 ${input.processingOptions.targetColorCount}。`,
      afterSummary: '保持当前网格，提升细节保护等级并降低去噪强度。',
    },
    {
      id: 'option-balance-2',
      title: '简化杂色分布',
      summary: '控制零碎色块，提升配色均衡性。',
      targetAnomalyIds: ['anomaly-1'],
      patch: {
        processingOptions: {
          denoise: true,
          mergeSimilarColors: true,
          cleanRareColors: true,
          targetColorCount: Math.max(4, input.processingOptions.targetColorCount - 1),
        },
      },
      cellEdits: directFixEdits,
      expectedBenefits: ['减少稀有色和局部噪点', '购物清单更稳定'],
      risks: ['极小面积装饰细节可能被合并'],
      beforeSummary: `当前保留 ${input.processingOptions.targetColorCount} 色。`,
      afterSummary: '适度收敛配色数，并启用稀有色清理。',
    },
  ]
}

function buildFallbackCellEdits(input: AnalyzeTaskInput): PatternCellEdit[] {
  if (!input.patternSnapshot) {
    return []
  }

  const { width, height, cells } = input.patternSnapshot
  const edits: PatternCellEdit[] = []
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width) + x
      const currentColorId = cells[index]
      if (!currentColorId) {
        continue
      }

      const neighborCounts = new Map<string, number>()
      for (const [dx, dy] of directions) {
        const nextX = x + dx
        const nextY = y + dy
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
          continue
        }
        const neighborColorId = cells[(nextY * width) + nextX]
        if (!neighborColorId) {
          continue
        }
        neighborCounts.set(neighborColorId, (neighborCounts.get(neighborColorId) ?? 0) + 1)
      }

      let bestNeighborColorId: string | null = null
      let bestNeighborCount = 0
      for (const [neighborColorId, count] of neighborCounts) {
        if (neighborColorId !== currentColorId && count > bestNeighborCount) {
          bestNeighborColorId = neighborColorId
          bestNeighborCount = count
        }
      }

      if (bestNeighborColorId && bestNeighborCount >= 3) {
        edits.push({
          x,
          y,
          colorId: bestNeighborColorId,
          reason: '该位置与周围主色不一致，建议并入邻域主色以修正孤立错误拼豆。',
        })
      }

      if (edits.length >= 6) {
        return edits
      }
    }
  }

  return edits
}

function normalizeOptimizationOption(item: unknown, index: number, input: AnalyzeTaskInput): AIOptimizationOption | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const record = item as Record<string, unknown>
  return {
    id: normalizeString(record.id, `option-${index + 1}`),
    title: normalizeString(record.title, `优化方案 ${index + 1}`),
    summary: normalizeString(record.summary, '基于当前异常生成的参数优化方案。'),
    targetAnomalyIds: normalizeStringArray(record.targetAnomalyIds),
    patch: normalizePatch(record.patch, input),
    cellEdits: normalizeCellEdits(record.cellEdits, input),
    expectedBenefits: normalizeStringArray(record.expectedBenefits),
    risks: normalizeStringArray(record.risks),
    beforeSummary: normalizeString(record.beforeSummary, `当前网格 ${input.gridSize}，目标配色 ${input.processingOptions.targetColorCount}。`),
    afterSummary: normalizeString(record.afterSummary, '应用后将重新生成图纸并直接修正局部异常拼豆。'),
  }
}

function normalizeAnalysisResult(raw: unknown, input: AnalyzeTaskInput): AIAnalysisResult {
  const record = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const anomalies = Array.isArray(record.anomalies)
    ? record.anomalies.map((item, index) => normalizeAnomalyItem(item, index)).filter((item): item is AIAnomalyItem => item !== null)
    : []
  const options = Array.isArray(record.optimizationOptions)
    ? record.optimizationOptions
      .map((item, index) => normalizeOptimizationOption(item, index, input))
      .filter((item): item is AIOptimizationOption => item !== null)
    : []

  return {
    summary: normalizeString(record.summary, 'AI 已完成异常诊断，并给出可选参数优化方案。'),
    confidenceScore: Math.min(Math.max(normalizeNumber(record.confidenceScore, 0.88), 0), 1),
    suggestedDetailProtectionLevel: normalizeDetailLevel(
      record.suggestedDetailProtectionLevel,
      input.processingOptions.detailProtectionLevel,
    ),
    anomalies: anomalies.length > 0
      ? anomalies
      : [
        {
          id: 'anomaly-1',
          type: 'fidelity',
          title: '图案还原度存在风险',
          severity: 'medium',
          description: '当前参数组合可能导致主体边缘和配色层次还原不够稳定。',
          impact: '作品完成后可能显得层次偏平，局部识别度下降。',
          evidence: `网格 ${input.gridSize}，目标配色 ${input.processingOptions.targetColorCount}，细节密度分数 ${input.analysisFeatures.detailDensityScore.toFixed(2)}。`,
        },
      ],
    optimizationOptions: options.length >= 2 ? options.slice(0, 3) : buildFallbackOptions(input),
  }
}

function createAnalyzePrompt(input: AnalyzeTaskInput) {
  return [
    '你是拼豆作品异常诊断与参数优化助手。',
    '请严格只输出 JSON，不要输出 Markdown，不要输出解释。',
    '你的任务不是推荐泛化方案，而是识别当前拼豆图纸中的异常，并输出 2 到 3 套可落地的修复方案。',
    '必须识别以下异常维度：layout、color-balance、fidelity。',
    '每个异常必须包含：id、type、title、severity、description、impact、evidence。',
    '每个优化方案必须包含：id、title、summary、targetAnomalyIds、patch、cellEdits、expectedBenefits、risks、beforeSummary、afterSummary。',
    'patch 只允许修改 gridSize 和 processingOptions。',
    'cellEdits 用于直接修改图中错误拼豆，结构为 [{"x":12,"y":8,"colorId":"H3","reason":"string"}]。',
    '若提供了 cellEdits，请优先给出真正需要修正的局部错误拼豆，不要大面积改动。',
    '返回 JSON 结构如下：',
    '{"summary":"string","confidenceScore":0.93,"suggestedDetailProtectionLevel":"low|medium|high","anomalies":[{"id":"a1","type":"layout|color-balance|fidelity","title":"string","severity":"low|medium|high","description":"string","impact":"string","evidence":"string"}],"optimizationOptions":[{"id":"o1","title":"string","summary":"string","targetAnomalyIds":["a1"],"patch":{"gridSize":48,"processingOptions":{"targetColorCount":8,"denoise":true,"mergeSimilarColors":true,"preserveDetails":true,"cleanRareColors":false,"detailProtectionLevel":"high"}},"cellEdits":[{"x":12,"y":8,"colorId":"H3","reason":"string"}],"expectedBenefits":["string"],"risks":["string"],"beforeSummary":"string","afterSummary":"string"}]}',
    `当前网格: ${input.gridSize}`,
    `当前参数: ${JSON.stringify(input.processingOptions)}`,
    `算法分析摘要: ${JSON.stringify(input.analysisFeatures)}`,
    `当前图纸快照: ${input.patternSnapshot ? JSON.stringify(input.patternSnapshot) : '未提供'}`,
    `图片数据(截断): ${input.imageSrc.slice(0, 200)}...`,
  ].join('\n')
}

async function requestJsonResult<T>(context: AIProviderContext, model: string, prompt: string) {
  const response = await fetch(`${context.config.apiBaseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      input: [
        {
          role: 'system',
          content: '你必须始终只返回 JSON，不要附带解释。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const payload = await response.json() as ResponsesApiResponse

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `AI 服务请求失败: ${response.status}`)
  }

  return parseJson<T>(extractTextContent(payload))
}

export function createOpenAICompatibleProvider(context: AIProviderContext): AIProvider {
  return {
    analyze(input: AnalyzeTaskInput) {
      if (!context.config.analyzeModel) {
        throw new Error('缺少 AI_MODEL_ANALYZE 配置')
      }
      return requestJsonResult<Record<string, unknown>>(context, context.config.analyzeModel, createAnalyzePrompt(input))
        .then((result) => normalizeAnalysisResult(result, input))
    },
  }
}
