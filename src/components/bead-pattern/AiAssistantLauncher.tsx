type AiAssistantLauncherProps = {
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export default function AiAssistantLauncher({
  isOpen,
  onToggle,
  children,
}: AiAssistantLauncherProps) {
  return (
    <div
      className="fixed bottom-6 z-40 flex items-start gap-3 lg:bottom-auto lg:top-32"
      style={{ left: 'max(16px, calc((100vw - 1280px) / 2 - 110px))' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`pointer-events-auto flex h-[132px] w-[88px] shrink-0 flex-col items-center justify-center gap-3 border-[1.5px] border-[#14130F] bg-white px-3 py-4 text-center shadow-[4px_4px_0_#14130F] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_#14130F] ${
          isOpen ? 'text-[#1F4BFF]' : 'text-[#14130F]'
        }`}
        aria-expanded={isOpen}
        aria-label={isOpen ? '收起智能优化助手' : '展开智能优化助手'}
      >
        <span className="flex h-9 w-9 items-center justify-center border border-[#14130F] bg-[#F4F7FF] text-base font-bold">
          AI
        </span>
        <span className="text-xs font-bold leading-5">一键智能</span>
      </button>

      {isOpen ? (
        <div className="pointer-events-auto w-[min(420px,calc(100vw-7.5rem))] max-h-[min(720px,calc(100vh-8rem))] overflow-y-auto border-[1.5px] border-[#14130F] bg-white p-4 shadow-[6px_6px_0_#14130F]">
          {children}
        </div>
      ) : null}
    </div>
  )
}
