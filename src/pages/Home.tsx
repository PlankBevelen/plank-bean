import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ParametersCard,
  PatternCanvas,
  ShoppingListCard,
  SourceImageCard,
} from '../components/bead-pattern'
import type { LayoutExportContext, ShoppingListItem } from '../types'
import { drawPatternToCanvas, processImageToPattern } from '../utils'

export default function Home() {
  const { setCanExport, setExportAction } = useOutletContext<LayoutExportContext>()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [gridSize, setGridSize] = useState(32)
  const [usePalette, setUsePalette] = useState(true)
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setImageSrc(loadEvent.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageSrc(null)
    setShoppingList([])

    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const exportPattern = useCallback(() => {
    if (!canvasRef.current || !imageSrc) {
      return
    }

    const link = document.createElement('a')
    link.download = 'plank-bean-pattern.png'
    link.href = canvasRef.current.toDataURL()
    link.click()
  }, [imageSrc])

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
      if (!imageSrc || !canvasRef.current) {
        return
      }

      setIsProcessing(true)

      try {
        const pattern = await processImageToPattern(imageSrc, gridSize, usePalette)
        if (isCancelled || !canvasRef.current) {
          return
        }

        drawPatternToCanvas(canvasRef.current, pattern, usePalette)
        setShoppingList(pattern.shoppingList)
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
  }, [gridSize, imageSrc, usePalette])

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
          usePalette={usePalette}
          onGridSizeChange={setGridSize}
          onTogglePalette={() => setUsePalette((prev) => !prev)}
        />
      </div>

      <div className="lg:col-span-8 space-y-8">
        <PatternCanvas
          imageSrc={imageSrc}
          isProcessing={isProcessing}
          canvasRef={canvasRef}
        />

        <ShoppingListCard shoppingList={shoppingList} />
      </div>
    </div>
  )
}
