import type { PatternProcessingOptions } from '../src/types/bead-pattern.ts'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function createNodeReadableMirror(rootDir: string) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'plank-bean-verify-'))
  const sourceFiles: Array<[string, string]> = [
    ['src/utils/bead-pattern/pattern.ts', 'src/utils/bead-pattern/pattern.ts'],
    ['src/utils/bead-pattern/color.ts', 'src/utils/bead-pattern/color.ts'],
    ['src/utils/bead-pattern/palette.ts', 'src/utils/bead-pattern/palette.ts'],
    ['src/types/index.ts', 'src/types/index.ts'],
    ['src/types/bead-pattern.ts', 'src/types/bead-pattern.ts'],
  ]

  for (const [relativeSource, relativeTarget] of sourceFiles) {
    const sourcePath = path.join(rootDir, relativeSource)
    const targetPath = path.join(tempDir, relativeTarget)
    await mkdir(path.dirname(targetPath), { recursive: true })
    let content = await readFile(sourcePath, 'utf8')
    if (relativeTarget === 'src/utils/bead-pattern/pattern.ts') {
      content = content
        .replace("from '../../types'", "from '../../types/index.ts'")
        .replace("from './color'", "from './color.ts'")
        .replace("from './palette'", "from './palette.ts'")
    }
    if (relativeTarget === 'src/utils/bead-pattern/color.ts') {
      content = content
        .replace("from '../../types'", "from '../../types/index.ts'")
        .replace("from './palette'", "from './palette.ts'")
    }
    if (relativeTarget === 'src/types/index.ts') {
      content = content.replace("from './bead-pattern'", "from './bead-pattern.ts'")
    }
    await writeFile(targetPath, content, 'utf8')
  }

  await writeFile(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ type: 'module' }, null, 2),
    'utf8',
  )

  return tempDir
}

type PatternTestingModule = {
  __PATTERN_TESTING__: {
    isOutlinePixel: (r: number, g: number, b: number) => boolean
    mergeRareColors: (
      ids: Array<string | null>,
      width: number,
      height: number,
      options: PatternProcessingOptions,
    ) => Array<string | null>
    neighborhoodSmooth: (
      ids: Array<string | null>,
      width: number,
      height: number,
      options: PatternProcessingOptions,
      passes?: number,
    ) => Array<string | null>
    normalizePatternProcessingOptions: (
      options?: Partial<PatternProcessingOptions>,
    ) => PatternProcessingOptions
  }
  DEFAULT_PATTERN_PROCESSING_OPTIONS: PatternProcessingOptions
}

type PaletteModule = {
  BASIC_BEAD_PALETTE: Array<{ id: string, hex: string }>
}

function withOptions(
  testing: PatternTestingModule['__PATTERN_TESTING__'],
  defaults: PatternProcessingOptions,
  patch: Partial<PatternProcessingOptions>,
): PatternProcessingOptions {
  return testing.normalizePatternProcessingOptions({
    ...defaults,
    mode: 'manual',
    ...patch,
  })
}

function verifyOutlineDetection(testing: PatternTestingModule['__PATTERN_TESTING__']) {
  assert(testing.isOutlinePixel(18, 18, 18), '纯暗中性色应识别为描边候选')
  assert(!testing.isOutlinePixel(20, 20, 96), '深蓝色不应被误判为描边')
}

function verifyDetailSmoothingProtection(
  testing: PatternTestingModule['__PATTERN_TESTING__'],
  defaults: PatternProcessingOptions,
) {
  const grid = [
    'H8', 'H8', 'H8',
    'H8', 'H1', 'H8',
    'H8', 'H8', 'H8',
  ]

  const preserved = testing.neighborhoodSmooth(grid, 3, 3, withOptions(testing, defaults, {
    preserveDetails: true,
    detailProtectionLevel: 'high',
  }))
  assert(preserved[4] === 'H1', '高细节保护下，高对比亮点应被保留')

  const cleaned = testing.neighborhoodSmooth(grid, 3, 3, withOptions(testing, defaults, {
    preserveDetails: false,
    detailProtectionLevel: 'low',
  }))
  assert(cleaned[4] === 'H8', '关闭细节保护后，孤立亮点应被平滑')
}

function verifyRareColorProtection(
  testing: PatternTestingModule['__PATTERN_TESTING__'],
  defaults: PatternProcessingOptions,
) {
  const width = 10
  const height = 10
  const grid = new Array<string>(width * height).fill('H8')
  grid[44] = 'H1'

  const preserved = testing.mergeRareColors(grid, width, height, withOptions(testing, defaults, {
    preserveDetails: true,
    detailProtectionLevel: 'high',
    cleanRareColors: true,
  }))
  assert(preserved[44] === 'H1', '保细节模式下，高对比稀有色应被保留')

  const cleaned = testing.mergeRareColors(grid, width, height, withOptions(testing, defaults, {
    preserveDetails: false,
    detailProtectionLevel: 'low',
    cleanRareColors: true,
  }))
  assert(cleaned[44] === 'H8', '清理模式下，孤立稀有色应被并入主色')
}

function verifyDefaultOptions(
  testing: PatternTestingModule['__PATTERN_TESTING__'],
  defaults: PatternProcessingOptions,
) {
  const normalized = testing.normalizePatternProcessingOptions()
  assert(normalized.preserveDetails === true, '默认配置应开启细节保护')
  assert(normalized.cleanRareColors === false, '默认配置不应激进清理稀有色')
  assert(normalized.detailProtectionLevel === 'high', '默认细节保护等级应为 high')
  assert(defaults.preserveDetails === true, '默认导出配置应与归一化结果一致')
}

function verifyPaletteUniqueness(palette: PaletteModule['BASIC_BEAD_PALETTE']) {
  const seen = new Set<string>()
  for (const color of palette) {
    assert(!seen.has(color.hex), `色板中存在重复色值: ${color.id} -> ${color.hex}`)
    seen.add(color.hex)
  }
}

async function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const tempDir = await createNodeReadableMirror(rootDir)

  try {
    const moduleUrl = pathToFileURL(path.join(tempDir, 'src/utils/bead-pattern/pattern.ts')).href
    const paletteUrl = pathToFileURL(path.join(tempDir, 'src/utils/bead-pattern/palette.ts')).href
    const imported = await import(moduleUrl) as PatternTestingModule
    const paletteModule = await import(paletteUrl) as PaletteModule
    verifyOutlineDetection(imported.__PATTERN_TESTING__)
    verifyDetailSmoothingProtection(imported.__PATTERN_TESTING__, imported.DEFAULT_PATTERN_PROCESSING_OPTIONS)
    verifyRareColorProtection(imported.__PATTERN_TESTING__, imported.DEFAULT_PATTERN_PROCESSING_OPTIONS)
    verifyDefaultOptions(imported.__PATTERN_TESTING__, imported.DEFAULT_PATTERN_PROCESSING_OPTIONS)
    verifyPaletteUniqueness(paletteModule.BASIC_BEAD_PALETTE)
    console.log('algorithm verification passed')
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

await main()
