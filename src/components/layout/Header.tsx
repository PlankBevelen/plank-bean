import { DownloadIcon } from '../common/Icons'
import type { PatternExportFormat } from '../../types'

type HeaderProps = {
  canExport: boolean
  exportFormat: PatternExportFormat
  exportError: string | null
  onExport: () => void
  onExportFormatChange: (format: PatternExportFormat) => void
  onDismissError: () => void
}

const EXPORT_OPTIONS: Array<{ value: PatternExportFormat, label: string }> = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WEBP' },
]

export default function Header({
  canExport,
  exportFormat,
  exportError,
  onExport,
  onExportFormatChange,
  onDismissError,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 w-full p-6 pointer-events-none">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 bg-[#1F4BFF] border-[1.5px] border-[#14130F] shadow-[4px_4px_0_#14130F] flex items-center justify-center rounded-none">
            <span className="text-white font-bold text-xl tracking-tighter" style={{ fontFamily: "'Space Mono', monospace" }}>PB</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PlankBean</h1>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="pattern-export-format">导出格式</label>
            <select
              id="pattern-export-format"
              value={exportFormat}
              onChange={(event) => onExportFormatChange(event.target.value as PatternExportFormat)}
              className="bg-white border-[1.5px] border-[#14130F] px-3 py-2 font-mono text-sm shadow-[4px_4px_0_#14130F] focus:outline-none focus:ring-2 focus:ring-[#1F4BFF] focus:ring-offset-2"
            >
              {EXPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onExport}
              disabled={!canExport}
              className="bg-white border-[1.5px] border-[#14130F] shadow-[4px_4px_0_#14130F] px-5 py-2.5 font-bold hover:translate-y-px hover:translate-x-px hover:shadow-[3px_3px_0_#14130F] transition-all flex items-center gap-2 rounded-none focus:outline-none focus:ring-2 focus:ring-[#1F4BFF] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#14130F]"
            >
              <DownloadIcon className="w-4 h-4" />
              导出图纸
            </button>
          </div>

          {exportError ? (
            <div className="max-w-md border-[1.5px] border-[#B42318] bg-[#FEF3F2] px-4 py-3 text-sm text-[#7A271A] shadow-[4px_4px_0_#B42318]">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-bold">导出失败</p>
                  <p className="mt-1 leading-relaxed">{exportError}</p>
                </div>
                <button
                  type="button"
                  onClick={onDismissError}
                  className="border border-[#B42318] px-2 py-1 text-xs font-bold hover:bg-[#FEE4E2]"
                >
                  关闭
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
