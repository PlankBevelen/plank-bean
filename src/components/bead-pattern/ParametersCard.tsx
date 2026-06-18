import { SettingsIcon } from '../common/Icons'

type ParametersCardProps = {
  gridSize: number
  usePalette: boolean
  onGridSizeChange: (value: number) => void
  onTogglePalette: () => void
}

export default function ParametersCard({
  gridSize,
  usePalette,
  onGridSizeChange,
  onTogglePalette,
}: ParametersCardProps) {
  return (
    <div className="bg-white border border-gray-200 p-6 rounded-none relative">
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-400"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gray-400"></div>

      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-bold">Parameters</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="text-sm font-bold text-gray-700">Grid Size (Max)</label>
            <span
              className="text-lg font-bold text-[#1F4BFF]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {gridSize}px
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={gridSize}
            onChange={(event) => onGridSizeChange(Number.parseInt(event.target.value, 10))}
            className="w-full h-2 bg-gray-200 appearance-none outline-none focus:ring-2 focus:ring-[#1F4BFF] focus:ring-offset-1 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#1F4BFF] [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-[#14130F] [&::-webkit-slider-thumb]:rounded-none"
          />
          <div className="flex justify-between text-xs text-gray-400 font-mono">
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="font-bold text-sm">Restrict Palette</p>
            <p className="text-xs text-gray-500">Snap to closest bead color</p>
          </div>
          <button
            type="button"
            onClick={onTogglePalette}
            className={`w-12 h-6 rounded-none border-[1.5px] border-[#14130F] relative transition-colors ${usePalette ? 'bg-[#1F4BFF]' : 'bg-gray-100'}`}
          >
            <div
              className={`absolute top-[1px] w-[18px] h-[18px] border-[1.5px] border-[#14130F] transition-transform ${usePalette ? 'translate-x-[26px] bg-white' : 'translate-x-[2px] bg-white'}`}
            ></div>
          </button>
        </div>
      </div>
    </div>
  )
}
