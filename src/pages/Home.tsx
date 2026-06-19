import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ParametersCard,
  PatternCanvas,
  ShoppingListCard,
  SourceImageCard,
} from '../components/bead-pattern'
import { usePatternStore } from '../store'
import {
  BEAD_DISPLAY_SIZE,
  drawPatternToCanvas,
  processImageToPattern,
} from '../utils'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasHydrated = usePatternStore((store) => store.hasHydrated)
  const imageSrc = usePatternStore((store) => store.imageSrc)
  const gridSize = usePatternStore((store) => store.gridSize)
  const processingOptions = usePatternStore((store) => store.processingOptions)
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
  const recommendation = pattern?.recommendation ?? null
  const canEdit = Boolean(pattern && shoppingList.length > 0 && !isProcessing)
  const requestedGridSize = processingOptions.mode === 'manual' ? gridSize : 0

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setImageSrc(loadEvent.target?.result as string)
      setPattern(null)
      setIsEditMode(false)
      setSelectedColorId(null)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
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
        const nextPattern = await processImageToPattern(imageSrc, requestedGridSize, true, processingOptions)
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
  }, [hasHydrated, imageSrc, processingOptions, requestedGridSize, setIsProcessing, setPattern])

  useEffect(() => {
    if (processingOptions.mode !== 'auto' || !pattern) {
      return
    }

    const recommendedGridSize = pattern.recommendation.gridSize
    if (recommendedGridSize !== gridSize) {
      setGridSize(recommendedGridSize)
    }
  }, [gridSize, pattern, processingOptions.mode, setGridSize])

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
    if (isFullscreen) {
      return
    }
    setIsEditMode(false)
    setSelectedColorId(null)
  }, [isFullscreen, setIsEditMode, setSelectedColorId])

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
