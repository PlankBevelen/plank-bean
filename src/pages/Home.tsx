import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AiAssistantCard,
  AiAssistantLauncher,
  ParametersCard,
  PatternCanvas,
  ShoppingListCard,
  SourceImageCard,
} from '../components/bead-pattern'
import { aiTaskService } from '../services'
import type {
  AIOptimizationOption,
  AnalysisTaskResponse,
  PatternCellEdit,
  PatternParameterMode,
} from '../types'
import { usePatternStore } from '../store'
import {
  BEAD_DISPLAY_SIZE,
  BEAD_PALETTE,
  buildSystemPatternRecommendation,
  drawPatternToCanvas,
  normalizePatternProcessingOptions,
  processImageToPattern,
} from '../utils'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const aiTaskRunRef = useRef(0)
  const pendingAiCellEditsRef = useRef<PatternCellEdit[]>([])
  const pendingAiEditTargetRef = useRef<{
    imageSrc: string
    gridSize: number
    processingOptionsJson: string
  } | null>(null)
  const hasHydrated = usePatternStore((store) => store.hasHydrated)
  const imageSrc = usePatternStore((store) => store.imageSrc)
  const gridSize = usePatternStore((store) => store.gridSize)
  const processingOptions = usePatternStore((store) => store.processingOptions)
  const applyParameterPatch = usePatternStore((store) => store.applyParameterPatch)
  const applyPatternCellEdits = usePatternStore((store) => store.applyPatternCellEdits)
  const pattern = usePatternStore((store) => store.pattern)
  const isProcessing = usePatternStore((store) => store.isProcessing)
  const isFullscreen = usePatternStore((store) => store.isFullscreen)
  const isEditMode = usePatternStore((store) => store.isEditMode)
  const selectedColorId = usePatternStore((store) => store.selectedColorId)
  const setImageSrc = usePatternStore((store) => store.setImageSrc)
  const setGridSize = usePatternStore((store) => store.setGridSize)
  const updateProcessingOptions = usePatternStore((store) => store.updateProcessingOptions)
  const setPattern = usePatternStore((store) => store.setPattern)
  const updatePatternCell = usePatternStore((store) => store.updatePatternCell)
  const setIsProcessing = usePatternStore((store) => store.setIsProcessing)
  const setIsFullscreen = usePatternStore((store) => store.setIsFullscreen)
  const setIsEditMode = usePatternStore((store) => store.setIsEditMode)
  const setSelectedColorId = usePatternStore((store) => store.setSelectedColorId)
  const clearPatternSession = usePatternStore((store) => store.clearPatternSession)
  const shoppingList = useMemo(() => pattern?.shoppingList ?? [], [pattern])
  const canEdit = Boolean(pattern && shoppingList.length > 0 && !isProcessing)
  const [analysisTask, setAnalysisTask] = useState<AnalysisTaskResponse | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [parameterMode, setParameterMode] = useState<PatternParameterMode>('recommended')
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false)

  const resetAnalysisSession = useCallback((keepAssistantOpen = true, clearPendingAiEdits = true) => {
    aiTaskRunRef.current += 1
    setAnalysisTask(null)
    setAnalysisError(null)
    setSelectedOptionId(null)
    setIsCreatingAnalysis(false)
    if (clearPendingAiEdits) {
      pendingAiCellEditsRef.current = []
      pendingAiEditTargetRef.current = null
    }
    if (!keepAssistantOpen) {
      setIsAssistantOpen(false)
    }
  }, [])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      resetAnalysisSession(false)
      setImageSrc(loadEvent.target?.result as string)
      setPattern(null)
      setIsEditMode(false)
      setSelectedColorId(null)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    resetAnalysisSession(false)
    clearPatternSession()

    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    let isCancelled = false

    async function syncPattern() {
      if (!imageSrc) {
        setPattern(null)
        return
      }
      setIsProcessing(true)

      try {
        const nextPattern = await processImageToPattern(imageSrc, gridSize, true, processingOptions)
        if (isCancelled) {
          return
        }

        setPattern(nextPattern)
      } catch (error) {
        console.error('生成拼豆图纸失败', error)
      } finally {
        if (!isCancelled) {
          setIsProcessing(false)
        }
      }
    }

    syncPattern()

    return () => {
      isCancelled = true
    }
  }, [gridSize, hasHydrated, imageSrc, processingOptions, setIsProcessing, setPattern])

  useEffect(() => {
    if (!analysisTask || !['pending', 'processing'].includes(analysisTask.status)) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const nextTask = await aiTaskService.getAnalyzeTask(analysisTask.taskId)
        if (!cancelled) {
          setAnalysisTask(nextTask)
        }
      } catch (error) {
        if (!cancelled) {
          setAnalysisError(error instanceof Error ? error.message : '查询 AI 识别任务失败')
        }
      }
    }, 1500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [analysisTask])

  useEffect(() => {
    if (!canvasRef.current) {
      return
    }

    const context = canvasRef.current.getContext('2d')
    if (!pattern) {
      context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      return
    }

    drawPatternToCanvas(canvasRef.current, pattern, true)
  }, [hasHydrated, isFullscreen, pattern])

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!isEditMode) {
      return
    }
    if (shoppingList.length === 0) {
      setSelectedColorId(null)
      return
    }
    if (!selectedColorId || !BEAD_PALETTE.some((item) => item.id === selectedColorId)) {
      setSelectedColorId(shoppingList[0].color.id)
    }
  }, [isEditMode, selectedColorId, setSelectedColorId, shoppingList])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen, setIsFullscreen])

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen, setIsFullscreen])

  const handleToggleAssistant = useCallback(() => {
    setIsAssistantOpen((current) => !current)
  }, [])

  const systemRecommendation = useMemo(() => (
    pattern ? buildSystemPatternRecommendation(pattern, gridSize, processingOptions) : null
  ), [gridSize, pattern, processingOptions])

  const handleGridSizeChange = useCallback((value: number) => {
    resetAnalysisSession(true)
    setParameterMode('manual')
    setGridSize(value)
  }, [resetAnalysisSession, setGridSize])

  const handleProcessingOptionsChange = useCallback((patch: Parameters<typeof updateProcessingOptions>[0]) => {
    resetAnalysisSession(true)
    setParameterMode('manual')
    updateProcessingOptions(patch)
  }, [resetAnalysisSession, updateProcessingOptions])

  const handleParameterModeChange = useCallback((mode: PatternParameterMode) => {
    setParameterMode(mode)
  }, [])

  const handleApplyRecommendation = useCallback(() => {
    if (!systemRecommendation) {
      return
    }
    resetAnalysisSession(true)
    setGridSize(systemRecommendation.gridSize)
    updateProcessingOptions(systemRecommendation.processingOptions)
  }, [resetAnalysisSession, setGridSize, systemRecommendation, updateProcessingOptions])

  const handleToggleEditMode = useCallback(() => {
    if (!canEdit) {
      return
    }

    const next = !isEditMode
    setIsEditMode(next)
    if (!next) {
      setSelectedColorId(null)
      return
    }
    setSelectedColorId(selectedColorId ?? shoppingList[0]?.color.id ?? null)
  }, [canEdit, isEditMode, selectedColorId, setIsEditMode, setSelectedColorId, shoppingList])

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !pattern || !isEditMode || !selectedColorId) {
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return
    }

    const canvasX = ((event.clientX - rect.left) * canvasRef.current.width) / rect.width
    const canvasY = ((event.clientY - rect.top) * canvasRef.current.height) / rect.height
    const x = Math.floor(canvasX / BEAD_DISPLAY_SIZE)
    const y = Math.floor(canvasY / BEAD_DISPLAY_SIZE)

    if (x < 0 || x >= pattern.width || y < 0 || y >= pattern.height) {
      return
    }

    const cellIndex = (y * pattern.width) + x
    updatePatternCell(cellIndex, selectedColorId)
  }, [isEditMode, pattern, selectedColorId, updatePatternCell])

  const analysisPayload = useMemo(() => {
    if (!imageSrc || !pattern) {
      return null
    }
    return {
      imageSrc,
      gridSize,
      processingOptions,
      analysisFeatures: pattern.analysisFeatures,
      patternSnapshot: {
        width: pattern.width,
        height: pattern.height,
        cells: pattern.cells.map((cell) => (cell.isEmpty ? null : (cell.colorId ?? null))),
      },
    }
  }, [gridSize, imageSrc, pattern, processingOptions])

  const analysisSnapshotKey = useMemo(() => (
    analysisPayload ? JSON.stringify(analysisPayload) : null
  ), [analysisPayload])

  const selectedOption = useMemo<AIOptimizationOption | null>(() => {
    if (!analysisTask?.result || !selectedOptionId) {
      return null
    }
    return analysisTask.result.optimizationOptions.find((option) => option.id === selectedOptionId) ?? null
  }, [analysisTask, selectedOptionId])

  const processingOptionsJson = useMemo(() => JSON.stringify(processingOptions), [processingOptions])

  useEffect(() => {
    if (
      pendingAiCellEditsRef.current.length === 0 ||
      !pendingAiEditTargetRef.current ||
      !pattern ||
      !imageSrc ||
      isProcessing
    ) {
      return
    }

    const targetMatched =
      pendingAiEditTargetRef.current.imageSrc === imageSrc &&
      pendingAiEditTargetRef.current.gridSize === gridSize &&
      pendingAiEditTargetRef.current.processingOptionsJson === processingOptionsJson

    if (!targetMatched) {
      return
    }

    const nextPendingEdits = pendingAiCellEditsRef.current
    pendingAiCellEditsRef.current = []
    pendingAiEditTargetRef.current = null
    applyPatternCellEdits(nextPendingEdits)
  }, [
    applyPatternCellEdits,
    gridSize,
    imageSrc,
    isProcessing,
    pattern,
    processingOptionsJson,
  ])

  const handleStartAnalysis = useCallback(async () => {
    if (!analysisPayload || !analysisSnapshotKey || isCreatingAnalysis) {
      return
    }

    aiTaskRunRef.current += 1
    const currentRun = aiTaskRunRef.current

    setIsCreatingAnalysis(true)
    setAnalysisTask(null)
    setAnalysisError(null)
    setSelectedOptionId(null)

    try {
      const analysis = await aiTaskService.createAnalyzeTask(analysisPayload)
      if (currentRun === aiTaskRunRef.current) {
        setAnalysisTask(analysis)
      }
    } catch (error) {
      if (currentRun === aiTaskRunRef.current) {
        setAnalysisError(error instanceof Error ? error.message : '创建 AI 分析任务失败')
      }
    } finally {
      if (currentRun === aiTaskRunRef.current) {
        setIsCreatingAnalysis(false)
      }
    }
  }, [analysisPayload, analysisSnapshotKey, isCreatingAnalysis])

  const handleSelectOption = useCallback((optionId: string) => {
    setSelectedOptionId((current) => (current === optionId ? null : optionId))
  }, [])

  const handleApplySelectedOption = useCallback(() => {
    if (!selectedOption) {
      return
    }
    const nextProcessingOptions = normalizePatternProcessingOptions({
      ...processingOptions,
      ...selectedOption.patch.processingOptions,
    })
    const nextGridSize = selectedOption.patch.gridSize ?? gridSize
    const hasParameterPatch =
      nextGridSize !== gridSize || JSON.stringify(nextProcessingOptions) !== processingOptionsJson

    if (hasParameterPatch) {
      setParameterMode('manual')
      if (selectedOption.cellEdits.length > 0 && imageSrc) {
        pendingAiCellEditsRef.current = selectedOption.cellEdits
        pendingAiEditTargetRef.current = {
          imageSrc,
          gridSize: nextGridSize,
          processingOptionsJson: JSON.stringify(nextProcessingOptions),
        }
        resetAnalysisSession(true, false)
      } else {
        resetAnalysisSession(true)
      }
      applyParameterPatch({
        ...selectedOption.patch,
        processingOptions: nextProcessingOptions,
      })
      return
    }

    if (selectedOption.cellEdits.length > 0) {
      applyPatternCellEdits(selectedOption.cellEdits)
    }
    resetAnalysisSession(true)
  }, [
    applyParameterPatch,
    applyPatternCellEdits,
    gridSize,
    imageSrc,
    processingOptions,
    processingOptionsJson,
    resetAnalysisSession,
    selectedOption,
  ])

  const aiAssistant = (
    <AiAssistantCard
      hasAnalysisInput={Boolean(analysisPayload)}
      analysisTask={analysisTask}
      analysisError={analysisError}
      isCreatingAnalysis={isCreatingAnalysis}
      selectedOptionId={selectedOptionId}
      onStartAnalysis={handleStartAnalysis}
      onSelectOption={handleSelectOption}
      onApplySelectedOption={handleApplySelectedOption}
    />
  )

  if (isFullscreen) {
    return (
      <PatternCanvas
        imageSrc={imageSrc}
        isProcessing={isProcessing}
        canvasRef={canvasRef}
        isFullscreen
        canEdit={canEdit}
        isEditMode={isEditMode}
        selectedColorId={selectedColorId}
        shoppingList={shoppingList}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleEditMode={handleToggleEditMode}
        onCanvasClick={handleCanvasClick}
        onSelectColor={setSelectedColorId}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <SourceImageCard
          imageSrc={imageSrc}
          fileInputRef={fileInputRef}
          onUpload={handleImageUpload}
          onClear={clearImage}
        />
        <ParametersCard
          parameterMode={parameterMode}
          gridSize={gridSize}
          processingOptions={processingOptions}
          recommendation={systemRecommendation}
          onParameterModeChange={handleParameterModeChange}
          onApplyRecommendation={handleApplyRecommendation}
          onGridSizeChange={handleGridSizeChange}
          onProcessingOptionsChange={handleProcessingOptionsChange}
        />
      </div>

      <div className="lg:col-span-8 space-y-8">
        <PatternCanvas
          imageSrc={imageSrc}
          isProcessing={isProcessing}
          canvasRef={canvasRef}
          isFullscreen={false}
          canEdit={canEdit}
          isEditMode={isEditMode}
          selectedColorId={selectedColorId}
          shoppingList={shoppingList}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleEditMode={handleToggleEditMode}
          onCanvasClick={handleCanvasClick}
          onSelectColor={setSelectedColorId}
        />
        <ShoppingListCard shoppingList={shoppingList} />
      </div>

      <AiAssistantLauncher
        isOpen={isAssistantOpen}
        onToggle={handleToggleAssistant}
      >
        {aiAssistant}
      </AiAssistantLauncher>
    </div>
  )
}
