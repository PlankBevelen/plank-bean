import type {
  PatternParameterMode,
  PatternProcessingOptions,
  PatternSystemRecommendation,
} from '../../types'
import { SettingsIcon } from '../common/Icons'

const DETAIL_LEVEL_OPTIONS: Array<{
  value: PatternProcessingOptions['detailProtectionLevel']
  label: string
}> = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

type ParametersCardProps = {
  parameterMode: PatternParameterMode
  gridSize: number
  processingOptions: PatternProcessingOptions
  recommendation: PatternSystemRecommendation | null
  onParameterModeChange: (mode: PatternParameterMode) => void
  onApplyRecommendation: () => void
  onGridSizeChange: (value: number) => void
  onProcessingOptionsChange: (patch: Partial<PatternProcessingOptions>) => void
}

export default function ParametersCard({
  parameterMode,
  gridSize,
  processingOptions,
  recommendation,
  onParameterModeChange,
  onApplyRecommendation,
  onGridSizeChange,
  onProcessingOptionsChange,
}: ParametersCardProps) {
  const toggleOptions: Array<{
    key: 'preserveDetails' | 'denoise' | 'mergeSimilarColors' | 'cleanRareColors'
    title: string
    description: string
    checked: boolean
  }> = [
    {
      key: 'preserveDetails',
      title: '优先保留细节',
      description: '尽量保住高光、发丝、配饰等小面积细节，默认建议开启',
      checked: processingOptions.preserveDetails,
    },
    {
      key: 'denoise',
      title: '邻域去噪',
      description: '清理孤立噪点，让区域更连贯；关闭后更适合保留尖锐细节',
      checked: processingOptions.denoise,
    },
    {
      key: 'mergeSimilarColors',
      title: '合并相近豆色',
      description: '把肉眼几乎分不开的色号自动并掉，购物单更干净',
      checked: processingOptions.mergeSimilarColors,
    },
    {
      key: 'cleanRareColors',
      title: '清理稀有色',
      description: '把很少出现的零散颜色并掉，适合想要更干净图纸时开启',
      checked: processingOptions.cleanRareColors,
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

      <div className="space-y-6">
        <p className="text-xs text-gray-500 leading-relaxed">
          参数设置支持系统算法推荐与手动微调两种模式。AI 智能修正负责识别并处理异常拼豆，不替代系统参数推荐。
        </p>

        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'recommended', label: '推荐设置' },
            { value: 'manual', label: '手动设置' },
          ] as const).map((option) => {
            const active = parameterMode === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onParameterModeChange(option.value)}
                className={`border-[1.5px] px-3 py-2 text-sm font-bold transition-colors ${
                  active
                    ? 'border-[#14130F] bg-[#1F4BFF] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {parameterMode === 'recommended' ? (
          recommendation ? (
            <div className="space-y-4 border border-gray-200 bg-[#F8FAFF] p-4">
              <div>
                <p className="text-sm font-bold text-gray-900">系统算法推荐</p>
                <p className="mt-1 text-xs leading-6 text-gray-500">{recommendation.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 bg-white px-3 py-3">
                  <p className="text-xs font-bold text-gray-400">推荐网格</p>
                  <p className="mt-2 text-lg font-bold text-[#1F4BFF]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {recommendation.gridSize}
                  </p>
                </div>
                <div className="border border-gray-200 bg-white px-3 py-3">
                  <p className="text-xs font-bold text-gray-400">推荐配色数</p>
                  <p className="mt-2 text-lg font-bold text-[#1F4BFF]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {recommendation.processingOptions.targetColorCount}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  `细节等级：${DETAIL_LEVEL_OPTIONS.find((item) => item.value === recommendation.processingOptions.detailProtectionLevel)?.label ?? '中'}`,
                  `邻域去噪：${recommendation.processingOptions.denoise ? '开启' : '关闭'}`,
                  `相近色合并：${recommendation.processingOptions.mergeSimilarColors ? '开启' : '关闭'}`,
                  `稀有色清理：${recommendation.processingOptions.cleanRareColors ? '开启' : '关闭'}`,
                ].map((item) => (
                  <div key={item} className="border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                    {item}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {recommendation.reasons.map((reason) => (
                  <div key={reason} className="border border-gray-200 bg-white px-3 py-2 text-xs leading-6 text-gray-600">
                    <span className="font-bold text-gray-700">推荐原因：</span>
                    {reason}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onApplyRecommendation}
                className="w-full border-[1.5px] border-[#14130F] bg-[#1F4BFF] px-4 py-2 text-sm font-bold text-white"
              >
                应用推荐设置
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-xs leading-6 text-gray-500">
              生成拼豆图纸后，这里会显示基于系统算法的推荐参数。
            </div>
          )
        ) : null}

        {parameterMode === 'manual' ? (
          <>

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

        <div className="space-y-4 pt-2">
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">细节保护等级</p>
                <p className="text-xs text-gray-500">等级越高，越倾向保留高光和小区域点缀</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DETAIL_LEVEL_OPTIONS.map((option) => {
                const active = processingOptions.detailProtectionLevel === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onProcessingOptionsChange({ detailProtectionLevel: option.value })}
                    className={`border-[1.5px] px-3 py-2 text-sm font-bold transition-colors ${
                      active
                        ? 'border-[#14130F] bg-[#1F4BFF] text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

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
          </>
        ) : null}
      </div>
    </div>
  )
}
