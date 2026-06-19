import { useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { usePatternStore } from '../../store'
import { exportPatternImage } from '../../utils'
import Header from './Header'

export default function Layout() {
  const pattern = usePatternStore((store) => store.pattern)
  const isProcessing = usePatternStore((store) => store.isProcessing)
  const exportFormat = usePatternStore((store) => store.exportFormat)
  const exportError = usePatternStore((store) => store.exportError)
  const setExportFormat = usePatternStore((store) => store.setExportFormat)
  const setExportError = usePatternStore((store) => store.setExportError)
  const clearExportError = usePatternStore((store) => store.clearExportError)
  const canExport = Boolean(pattern && pattern.shoppingList.length > 0 && !isProcessing)

  const handleExport = useCallback(async () => {
    if (!pattern) {
      setExportError('当前没有可导出的图纸数据，请先上传图片并生成拼豆图纸。')
      return
    }

    clearExportError()

    try {
      await exportPatternImage(pattern, exportFormat)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : '导出图纸时发生未知错误，请稍后重试。'
      setExportError(message)
    }
  }, [clearExportError, exportFormat, pattern, setExportError])

  return (
    <div 
      className="min-h-screen bg-[#fafafa] text-[#14130F] font-sans pb-20 selection:bg-[#1F4BFF] selection:text-white"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(20,19,15,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,19,15,0.06) 1px, transparent 1px)',
        backgroundSize: '22px 22px'
      }}
    >
      <Header
        canExport={canExport}
        exportFormat={exportFormat}
        exportError={exportError}
        onExport={() => void handleExport()}
        onExportFormatChange={setExportFormat}
        onDismissError={clearExportError}
      />
      <main className="max-w-7xl mx-auto px-6 mt-4">
        <Outlet />
      </main>
    </div>
  )
}
