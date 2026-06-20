import type {
  AIAnalysisResult,
  AIAnomalyItem,
  AIOptimizationOption,
  AnalysisTaskResponse,
  TaskStatus,
} from '../../types'

type AiAssistantCardProps = {
  hasAnalysisInput: boolean
  analysisTask: AnalysisTaskResponse | null
  analysisError: string | null
  isCreatingAnalysis: boolean
  selectedOptionId: string | null
  onStartAnalysis: () => void
  onSelectOption: (optionId: string) => void
  onApplySelectedOption: () => void
}

function getStatusMeta(status?: TaskStatus) {
  switch (status) {
    case 'pending':
      return {
        label: '排队中',
        tone: 'border-[#14130F] bg-[#F3F4F6] text-gray-700',
      }
    case 'processing':
      return {
        label: '处理中',
        tone: 'border-[#1F4BFF] bg-[#F4F7FF] text-[#1F4BFF]',
      }
    case 'succeeded':
      return {
        label: '已完成',
        tone: 'border-[#14130F] bg-white text-gray-900',
      }
    case 'failed':
      return {
        label: '失败',
        tone: 'border-[#B42318] bg-[#FEF3F2] text-[#7A271A]',
      }
    default:
      return {
        label: '未提交',
        tone: 'border-gray-300 bg-gray-100 text-gray-500',
      }
  }
}

function getDetailLevelText(value: string) {
  switch (value) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return value
  }
}

function PixelStat({ label, value, accent = 'text-[#1F4BFF]' }: { label: string, value: string, accent?: string }) {
  return (
    <div className="border border-gray-200 bg-gray-50 px-3 py-3">
      <p className="text-[11px] font-bold tracking-[0.12em] text-gray-400">{label}</p>
      <p className={`mt-2 text-lg font-bold ${accent}`} style={{ fontFamily: "'Space Mono', monospace" }}>
        {value}
      </p>
    </div>
  )
}

function ErrorStrip({ message }: { message: string }) {
  return (
    <div className="border border-[#B42318] bg-[#FEF3F2] px-3 py-2 text-xs font-bold text-[#7A271A]">
      {message}
    </div>
  )
}

function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <div className="border border-dashed border-gray-300 bg-gray-50 px-4 py-4">
      <p className="text-sm font-bold text-gray-700">{title}</p>
      <p className="mt-1 text-xs leading-6 text-gray-500">{description}</p>
    </div>
  )
}

function ActionCard({
  title,
  description,
  buttonLabel,
  disabled,
  onAction,
}: {
  title: string
  description: string
  buttonLabel: string
  disabled: boolean
  onAction: () => void
}) {
  return (
    <div className="border border-gray-200 bg-gray-50 px-4 py-4">
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="mt-2 text-xs leading-6 text-gray-500">{description}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="mt-4 w-full border-[1.5px] border-[#14130F] bg-[#1F4BFF] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function getSeverityMeta(severity: AIAnomalyItem['severity']) {
  switch (severity) {
    case 'high':
      return 'bg-[#FFD9D2] text-[#C53B13] border-[#14130F]'
    case 'medium':
      return 'bg-[#FFF3C4] text-[#7A5600] border-[#14130F]'
    default:
      return 'bg-[#DCE8FF] text-[#1F4BFF] border-[#14130F]'
  }
}

function getAnomalyTypeLabel(type: AIAnomalyItem['type']) {
  switch (type) {
    case 'layout':
      return '布局'
    case 'color-balance':
      return '配色'
    case 'fidelity':
      return '还原度'
    default:
      return type
  }
}

function AnomalyCard({ anomaly }: { anomaly: AIAnomalyItem }) {
  return (
    <div className="border border-gray-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{anomaly.title}</p>
          <p className="mt-1 text-xs text-gray-500">{getAnomalyTypeLabel(anomaly.type)}异常</p>
        </div>
        <span className={`border px-2 py-1 text-xs font-bold ${getSeverityMeta(anomaly.severity)}`}>
          {anomaly.severity.toUpperCase()}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-gray-700">{anomaly.description}</p>
      <div className="mt-3 grid gap-2">
        <div className="border border-gray-100 bg-gray-50 px-3 py-2 text-xs leading-6 text-gray-600">
          <span className="font-bold text-gray-700">影响：</span>
          {anomaly.impact}
        </div>
        <div className="border border-gray-100 bg-gray-50 px-3 py-2 text-xs leading-6 text-gray-600">
          <span className="font-bold text-gray-700">证据：</span>
          {anomaly.evidence}
        </div>
      </div>
    </div>
  )
}

function OptionCard({
  option,
  checked,
  onSelect,
}: {
  option: AIOptimizationOption
  checked: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full cursor-pointer border-[1.5px] p-4 text-left transition-colors ${
        checked
          ? 'border-[#1F4BFF] bg-[#F7F9FF]'
          : 'border-gray-200 bg-white hover:border-gray-400'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
            checked ? 'border-[#1F4BFF] bg-[#1F4BFF]' : 'border-gray-300 bg-white'
          }`}
        >
          <span className={`h-2 w-2 rounded-full bg-white ${checked ? 'opacity-100' : 'opacity-0'}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">{option.title}</p>
              <p className="mt-1 text-xs text-gray-500">{option.summary}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="border border-gray-100 bg-gray-50 px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">应用前</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{option.beforeSummary}</p>
            </div>
            <div className="border border-[#14130F] bg-[#FFF9E8] px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C07A00]">应用后</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{option.afterSummary}</p>
            </div>
          </div>

          {option.cellEdits.length > 0 ? (
            <div className="mt-4 border border-[#14130F] bg-[#F4F7FF] px-3 py-3">
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#1F4BFF]">
                直接改豆 {option.cellEdits.length} 处
              </p>
              <div className="mt-2 grid gap-2">
                {option.cellEdits.slice(0, 4).map((edit) => (
                  <div key={`${edit.x}-${edit.y}-${edit.colorId}`} className="border border-white bg-white px-3 py-2 text-xs leading-6 text-gray-600">
                    <span className="font-bold text-gray-700">
                      ({edit.x + 1}, {edit.y + 1}) → {edit.colorId}：
                    </span>
                    {edit.reason}
                  </div>
                ))}
                {option.cellEdits.length > 4 ? (
                  <div className="text-xs text-gray-500">
                    其余 {option.cellEdits.length - 4} 处会在应用时一并修正。
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2">
            {option.expectedBenefits.map((benefit) => (
              <div key={benefit} className="border border-gray-100 bg-white px-3 py-2 text-xs leading-6 text-gray-600">
                <span className="font-bold text-gray-700">预计改善：</span>
                {benefit}
              </div>
            ))}
            {option.risks.map((risk) => (
              <div key={risk} className="border border-gray-100 bg-white px-3 py-2 text-xs leading-6 text-gray-600">
                <span className="font-bold text-gray-700">风险提示：</span>
                {risk}
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

function AnalysisPanel({
  result,
  selectedOptionId,
  onSelectOption,
  onApplySelectedOption,
}: {
  result: AIAnalysisResult
  selectedOptionId: string | null
  onSelectOption: (optionId: string) => void
  onApplySelectedOption: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="border border-[#14130F] bg-[#FFF9E8] px-4 py-4">
        <p className="text-xs font-bold tracking-[0.12em] text-[#8A5B00]">异常诊断摘要</p>
        <p className="mt-2 text-sm leading-7 text-gray-700">{result.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PixelStat label="置信度" value={`${Math.round(result.confidenceScore * 100)}%`} />
        <PixelStat
          label="建议细节等级"
          value={getDetailLevelText(result.suggestedDetailProtectionLevel)}
          accent="text-[#11A36A]"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-gray-700">识别到的异常</p>
        <div className="grid gap-2">
          {result.anomalies.map((anomaly) => (
            <AnomalyCard key={anomaly.id} anomaly={anomaly} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-700">可选优化方案</p>
          <button
            type="button"
            disabled={!selectedOptionId}
            onClick={onApplySelectedOption}
            className="border-[1.5px] border-[#14130F] bg-[#1F4BFF] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            应用所选方案
          </button>
        </div>
        <div className="grid gap-2">
          {result.optimizationOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              checked={selectedOptionId === option.id}
              onSelect={() => onSelectOption(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AiAssistantCard({
  hasAnalysisInput,
  analysisTask,
  analysisError,
  isCreatingAnalysis,
  selectedOptionId,
  onStartAnalysis,
  onSelectOption,
  onApplySelectedOption,
}: AiAssistantCardProps) {
  const analysisStatus = getStatusMeta(analysisTask?.status)
  const isAnalyzing = isCreatingAnalysis || ['pending', 'processing'].includes(analysisTask?.status ?? '')
  const failureMessage = analysisError ?? analysisTask?.error ?? null

  return (
    <section className="space-y-4">
      <div className="border-b border-gray-100 pb-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-gray-400">智能优化助手</p>
          <h3 className="mt-2 text-lg font-bold text-gray-900">一键智能</h3>
          <p className="mt-1 text-xs leading-6 text-gray-500">
            先由你确认开始分析，再根据异常结果选择合适的优化方案应用到当前图纸。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-900">智能分析流程</p>
            <p className="mt-1 text-xs text-gray-500">识别布局、配色和还原度问题，再由你确认选用优化方案。</p>
          </div>
          <span className={`border px-2 py-1 text-xs font-bold ${analysisStatus.tone}`}>
            {isCreatingAnalysis ? '提交中' : analysisStatus.label}
          </span>
        </div>

        {!hasAnalysisInput ? (
          <EmptyState title="等待图纸准备完成" description="请先上传图片并生成拼豆图纸，然后再启动智能分析。" />
        ) : null}

        {hasAnalysisInput && !analysisTask && !failureMessage && !isAnalyzing ? (
          <ActionCard
            title="准备开始智能分析"
            description="点击下方按钮后，系统会对当前图纸做异常诊断，并返回可选优化方案。分析不会自动执行。"
            buttonLabel="开始智能分析"
            disabled={false}
            onAction={onStartAnalysis}
          />
        ) : null}

        {hasAnalysisInput && failureMessage ? (
          <div className="space-y-3">
            <ErrorStrip message={failureMessage} />
            <ActionCard
              title="重新发起智能分析"
              description="当前分析没有成功完成，你可以再次手动发起智能分析。"
              buttonLabel="重新开始分析"
              disabled={isAnalyzing}
              onAction={onStartAnalysis}
            />
          </div>
        ) : null}

        {isAnalyzing ? (
          <div className="border border-gray-200 bg-[#F8FAFF] px-4 py-4">
            <p className="text-sm font-bold text-gray-900">智能分析进行中</p>
            <p className="mt-2 text-xs leading-6 text-gray-500">
              正在分析当前拼豆图纸的布局、配色和还原度问题，请稍候查看结果。
            </p>
          </div>
        ) : null}

        {analysisTask?.result && !failureMessage ? (
          <AnalysisPanel
            result={analysisTask.result}
            selectedOptionId={selectedOptionId}
            onSelectOption={onSelectOption}
            onApplySelectedOption={onApplySelectedOption}
          />
        ) : null}
      </div>
    </section>
  )
}
