import type { PatternProcessingOptions, PatternRecommendation } from '../../types'
import { SettingsIcon } from '../common/Icons'

type ParametersCardProps = {
  gridSize: number
  processingOptions: PatternProcessingOptions
  recommendation: PatternRecommendation | null
  onGridSizeChange: (value: number) => void
  onProcessingOptionsChange: (patch: Partial<PatternProcessingOptions>) => void
}

export default function ParametersCard({
  gridSize,
  processingOptions,
  recommendation,
  onGridSizeChange,
  onProcessingOptionsChange,
}: ParametersCardProps) {
  const isAuto = processingOptions.mode === 'auto'

  const toggleOptions = [
    {
      key: 'mergeSimilarColors',
      title: '合并相近豆色',
      description: '把肉眼几乎分不开的色号自动并掉，购物单更干净',
      checked: processingOptions.mergeSimilarColors,
    },
  ] as const

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-none relative">
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-400"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gray-400"></div>

      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-bold">参数设置</h2>
      </div>

      {/* 模式切换 */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          type="button"
          onClick={() => onProcessingOptionsChange({ mode: 'auto' })}
          className={`border-[1.5px] px-3 py-3 text-sm font-bold transition-colors ${
            isAuto
              ? 'border-[#14130F] bg-[#1F4BFF] text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          推荐模式
        </button>
        <button
          type="button"
          onClick={() => onProcessingOptionsChange({ mode: 'manual' })}
          className={`border-[1.5px] px-3 py-3 text-sm font-bold transition-colors ${
            !isAuto
              ? 'border-[#14130F] bg-[#1F4BFF] text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          手动微调
        </button>
      </div>

      {isAuto ? (
        /* 推荐模式：只展示算法选出的结果摘要 */
        <div className="space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            已根据图片自动选择最合适的网格和配色数，直接上传即可。需要精修可切到手动微调。
          </p>

          <div className="border-[1.5px] border-[#14130F] divide-y divide-gray-100">
            <SummaryRow label="网格尺寸" value={recommendation ? `${recommendation.gridSize} 格` : '—'} />
            <SummaryRow label="配色数" value={recommendation ? `${recommendation.colorCount} 色` : '—'} />
          </div>
        </div>
      ) : (
        /* 手动模式：全部控件展开 */
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-gray-700">网格尺寸</label>
              <span className="text-lg font-bold text-[#1F4BFF]" style={{ fontFamily: "'Space Mono', monospace" }}>
                {gridSize}
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

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-700">自动推荐配色数</p>
                <p className="text-xs text-gray-500">关掉后可手动指定目标色数</p>
              </div>
              <button
                type="button"
                onClick={() => onProcessingOptionsChange({ autoRecommendColorCount: !processingOptions.autoRecommendColorCount })}
                className={`w-12 h-6 rounded-none border-[1.5px] border-[#14130F] relative transition-colors ${processingOptions.autoRecommendColorCount ? 'bg-[#1F4BFF]' : 'bg-gray-100'}`}
              >
                <div className={`absolute top-[1px] w-[18px] h-[18px] border-[1.5px] border-[#14130F] bg-white transition-transform ${processingOptions.autoRecommendColorCount ? 'translate-x-[26px]' : 'translate-x-[2px]'}`}></div>
              </button>
            </div>

            {!processingOptions.autoRecommendColorCount ? (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-gray-700">目标配色数</label>
                  <span className="text-lg font-bold text-[#1F4BFF]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {processingOptions.targetColorCount}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={processingOptions.targetColorCount}
                  onChange={(event) => onProcessingOptionsChange({ targetColorCount: Number.parseInt(event.target.value, 10) })}
                  className="w-full h-2 bg-gray-200 appearance-none outline-none focus:ring-2 focus:ring-[#1F4BFF] focus:ring-offset-1 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#1F4BFF] [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-[#14130F] [&::-webkit-slider-thumb]:rounded-none"
                />
                <div className="flex justify-between text-xs text-gray-400 font-mono">
                  <span>2</span>
                  <span>16</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 pt-2">
            {toggleOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="font-bold text-sm">{option.title}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onProcessingOptionsChange({ [option.key]: !option.checked })}
                  className={`w-12 h-6 rounded-none border-[1.5px] border-[#14130F] relative transition-colors flex-shrink-0 ml-3 ${option.checked ? 'bg-[#1F4BFF]' : 'bg-gray-100'}`}
                >
                  <div className={`absolute top-[1px] w-[18px] h-[18px] border-[1.5px] border-[#14130F] bg-white transition-transform ${option.checked ? 'translate-x-[26px]' : 'translate-x-[2px]'}`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      <span className="text-sm font-bold text-[#1F4BFF]" style={{ fontFamily: "'Space Mono', monospace" }}>
        {value}
      </span>
    </div>
  )
}