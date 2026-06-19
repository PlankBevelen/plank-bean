import { DownloadIcon } from '../common/Icons'

type HeaderProps = {
  canExport: boolean
  onExport: () => void
}

export default function Header({ canExport, onExport }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 w-full p-6 flex justify-between items-center pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="w-10 h-10 bg-[#1F4BFF] border-[1.5px] border-[#14130F] shadow-[4px_4px_0_#14130F] flex items-center justify-center rounded-none">
          <span className="text-white font-bold text-xl tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>PB</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">PlankBean</h1>
      </div>
      <button
        type="button"
        onClick={onExport}
        disabled={!canExport}
        className="pointer-events-auto bg-white border-[1.5px] border-[#14130F] shadow-[4px_4px_0_#14130F] px-5 py-2.5 font-bold hover:translate-y-px hover:translate-x-px hover:shadow-[3px_3px_0_#14130F] transition-all flex items-center gap-2 rounded-none focus:outline-none focus:ring-2 focus:ring-[#1F4BFF] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#14130F]"
      >
        <DownloadIcon className="w-4 h-4" />
        导出图纸
      </button>
    </header>
  )
}
