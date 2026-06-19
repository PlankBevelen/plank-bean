import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ParametersCard,
  PatternCanvas,
  ShoppingListCard,
  SourceImageCard,
} from '../components/bead-pattern'
import type {
  LayoutExportContext,
  PatternProcessingOptions,
  ProcessedPattern,
} from '../types'
import {
  BEAD_DISPLAY_SIZE,
  DEFAULT_PATTERN_PROCESSING_OPTIONS,
  drawPatternToCanvas,
  processImageToPattern,
  updatePatternCellColor,
} from '../utils'

export default function Home() {
  const { setCanExport, setExportAction } = useOutletContext<LayoutExportContext>()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [gridSize, setGridSize] = useState(48)
  const [processingOptions, setProcessingOptions] = useState<PatternProcessingOptions>(
    DEFAULT_PATTERN_PROCESSING_OPTIONS,
  )
  const [pattern, setPattern] = useState<ProcessedPattern | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shoppingList = pattern?.shoppingList ?? []
  const recommendation = pattern?.recommendation ?? null
  const canEdit = Boolean(pattern && shoppingList.length > 0 && !isProcessing)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setImageSrc(loadEvent.target?.result as string)
      setIsEditMode(false)
      setSelectedColorId(null)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageSrc(null)
    setPattern(null)
    setIsFullscreen(false)
    setIsEditMode(false)
    setSelectedColorId(null)

    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const exportPattern = useCallback(() => {
    if (!canvasRef.current || !pattern) {
      return
    }
    const link = document.createElement('a')
    link.download = 'PlankBean-拼豆图纸.png'
    link.href = canvasRef.current.toDataURL()
    link.click()
  }, [pattern])

  const updateProcessingOptions = useCallback((patch: Partial<PatternProcessingOptions>) => {
    setProcessingOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  useEffect(() => {
    setCanExport(shoppingList.length > 0)
  }, [setCanExport, shoppingList.length])

  useEffect(() => {
    setExportAction(() => exportPattern)
    return () => {
      setExportAction(null)
      setCanExport(false)
    }
  }, [exportPattern, setCanExport, setExportAction])

  useEffect(() => {
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

        // 推荐模式：把算法决定的网格写回滑块，方便用户切到手动时从推荐值起调
        if (processingOptions.mode === 'auto' && nextPattern.recommendation.gridSize !== gridSize) {
          setGridSize(nextPattern.recommendation.gridSize)
        }
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
  }, [gridSize, imageSrc, processingOptions])

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
  }, [pattern, isFullscreen])

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
    if (isFullscreen) {
      return
    }
    setIsEditMode(false)
    setSelectedColorId(null)
  }, [isFullscreen])

  useEffect(() => {
    if (!isEditMode) {
      return
    }
    if (shoppingList.length === 0) {
      setSelectedColorId(null)
      return
    }
    if (!selectedColorId || !shoppingList.some((item) => item.color.id === selectedColorId)) {
      setSelectedColorId(shoppingList[0].color.id)
    }
  }, [isEditMode, selectedColorId, shoppingList])

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
  }, [isFullscreen])

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  const handleToggleEditMode = useCallback(() => {
    if (!canEdit) {
      return
    }

    setIsEditMode((prev) => {
      const next = !prev
      if (!next) {
        setSelectedColorId(null)
      } else {
        setSelectedColorId((current) => current ?? shoppingList[0]?.color.id ?? null)
      }
      return next
    })
  }, [canEdit, shoppingList])

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
    setPattern((current) => (
      current ? updatePatternCellColor(current, cellIndex, selectedColorId) : current
    ))
  }, [isEditMode, pattern, selectedColorId])

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
          gridSize={gridSize}
          processingOptions={processingOptions}
          recommendation={recommendation}
          onGridSizeChange={setGridSize}
          onProcessingOptionsChange={updateProcessingOptions}
        />
      </div>

      <div className="lg:col-span-8 space-y-8">
        <PatternCanvas
          imageSrc={imageSrc}
          isProcessing={isProcessing}
          canvasRef={canvasRef}
          isFullscreen={false}
          canEdit={canEdit}
          isEditMode={false}
          selectedColorId={null}
          shoppingList={shoppingList}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleEditMode={handleToggleEditMode}
          onCanvasClick={handleCanvasClick}
          onSelectColor={setSelectedColorId}
        />
        <ShoppingListCard shoppingList={shoppingList} />
      </div>
    </div>
  )
}
