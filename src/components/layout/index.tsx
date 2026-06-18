import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import type { LayoutExportContext } from '../../types'
import Header from './Header'

export default function Layout() {
  const [canExport, setCanExport] = useState(false)
  const [exportAction, setExportAction] = useState<(() => void) | null>(null)

  return (
    <div 
      className="min-h-screen bg-[#fafafa] text-[#14130F] font-sans pb-20 selection:bg-[#1F4BFF] selection:text-white"
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(20,19,15,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,19,15,0.06) 1px, transparent 1px)',
        backgroundSize: '22px 22px'
      }}
    >
      <Header canExport={canExport} onExport={() => exportAction?.()} />
      <main className="max-w-7xl mx-auto px-6 mt-4">
        <Outlet context={{
          canExport,
          setCanExport,
          setExportAction,
        } satisfies LayoutExportContext} />
      </main>
    </div>
  )
}
