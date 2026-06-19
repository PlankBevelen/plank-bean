import type { ShoppingListItem } from '../../types'
import { ExpandIcon, ImageIcon, PencilIcon, ShrinkIcon } from '../common/Icons'

type PatternCanvasProps = {
  imageSrc: string | null
  isProcessing: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isFullscreen: boolean
  canEdit: boolean
  isEditMode: boolean
  selectedColorId: string | null
  shoppingList: ShoppingListItem[]
  onToggleFullscreen: () => void
  onToggleEditMode: () => void
  onCanvasClick: (event: React.MouseEvent<HTMLCanvasElement>) => void
  onSelectColor: (colorId: string) => void
}

export default function PatternCanvas({
  imageSrc,
  isProcessing,
  canvasRef,
  isFullscreen,
  canEdit,
  isEditMode,
  selectedColorId,
  shoppingList,
  onToggleFullscreen,
  onToggleEditMode,
  onCanvasClick,
  onSelectColor,
}: PatternCanvasProps) {
  const selectedColor = shoppingList.find((item) => item.color.id === selectedColorId)?.color ?? null

  return (
    <div
      className={isFullscreen
        ? 'fixed inset-0 z-50 flex h-screen flex-col bg-[color:var(--background)] text-[color:var(--foreground)]'
        : 'bg-white border-[1.5px] border-[#14130F] shadow-[4px_4px_0_#14130F] rounded-none'}
    >
      <div
        className={isFullscreen
          ? 'flex items-center justify-between gap-4 border-b border-[color:var(--border)] bg-[color:var(--background)]/95 px-5 py-4 backdrop-blur'
          : 'flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3'}
      >
        <div className="min-w-0">
          <h2 className="text-lg font-bold">拼豆组件窗口</h2>
          <p
            className={isFullscreen
              ? 'mt-1 text-sm text-[color:var(--muted-foreground)]'
              : 'mt-1 text-xs text-gray-500'}
          >
            {isEditMode
              ? '修改模式已开启，先在底部选择豆色，再点击画布上的目标拼豆完成替换。'
              : '展示经过分析处理后的拼豆结果，可在全屏下进入修改模式。'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleEditMode}
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-bold transition-colors ${
              isEditMode
                ? 'border-[#14130F] bg-[#1F4BFF] text-white'
                : isFullscreen
                  ? 'border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40'
            }`}
          >
            <PencilIcon className="h-4 w-4" />
            {isEditMode ? '退出修改' : '修改模式'}
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={isFullscreen
              ? 'inline-flex items-center gap-2 border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm font-bold hover:bg-[color:var(--accent)]'
              : 'inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:border-gray-400'}
          >
            {isFullscreen ? <ShrinkIcon className="h-4 w-4" /> : <ExpandIcon className="h-4 w-4" />}
            {isFullscreen ? '退出全屏' : '全屏查看'}
          </button>
        </div>
      </div>

      <div className={isFullscreen ? 'flex-1 min-h-0 px-4 py-4' : 'p-4'}>
        <div
          className={isFullscreen
            ? 'pattern-scrollbar relative flex h-full overflow-auto border border-[color:var(--border)] bg-[color:var(--card)] p-4'
            : 'pattern-scrollbar relative h-[600px] overflow-auto bg-white'}
        >
          {!imageSrc ? (
            <div
              className={isFullscreen
                ? 'flex h-full w-full flex-col items-center justify-center gap-3 text-[color:var(--muted-foreground)]'
                : 'flex h-full flex-col items-center justify-center gap-3 text-gray-400'}
            >
              <div
                className={isFullscreen
                  ? 'flex h-16 w-16 items-center justify-center border border-[color:var(--border)] opacity-60'
                  : 'flex h-16 w-16 items-center justify-center border border-gray-200 opacity-50'}
              >
                <ImageIcon className="h-6 w-6" />
              </div>
              <p className="font-mono text-sm tracking-widest">等待上传图片</p>
            </div>
          ) : (
            <div className="m-auto h-fit w-fit">
              <div
                className={isFullscreen
                  ? 'relative border border-[color:var(--border)] bg-white p-4 shadow-sm'
                  : 'relative border border-gray-200 bg-white p-4 shadow-sm'}
              >
                <canvas
                  ref={canvasRef}
                  className={`block bg-white ${isEditMode ? 'cursor-crosshair' : 'cursor-default'}`}
                  style={{ imageRendering: 'pixelated' }}
                  onClick={onCanvasClick}
                />
              </div>
            </div>
          )}

          {isProcessing && (
            <div
              className={isFullscreen
                ? 'absolute inset-0 flex items-center justify-center bg-[color:var(--background)]/80 backdrop-blur-sm'
                : 'absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm'}
            >
              <div className="font-mono font-bold text-[#1F4BFF] animate-pulse">处理中...</div>
            </div>
          )}
        </div>
      </div>

      {isFullscreen && isEditMode && shoppingList.length > 0 ? (
        <div className="border-t border-[color:var(--border)] bg-[color:var(--background)]/95 px-4 py-3 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">底部配色清单</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                选择一种拼豆后，直接点击画布上的目标位置即可替换。
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-[color:var(--muted-foreground)]">当前选择</span>
              {selectedColor ? (
                <span className="inline-flex items-center gap-2 border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1">
                  <span
                    className="h-4 w-4 border border-[#14130F]"
                    style={{ backgroundColor: selectedColor.hex }}
                  />
                  {selectedColor.id}
                </span>
              ) : (
                <span className="border border-[color:var(--border)] px-2 py-1">未选择</span>
              )}
            </div>
          </div>

          <div className="pattern-scrollbar flex gap-3 overflow-x-auto pb-2">
            {shoppingList.map((item) => {
              const isSelected = item.color.id === selectedColorId
              return (
                <button
                  key={item.color.id}
                  type="button"
                  onClick={() => onSelectColor(item.color.id)}
                  className={`flex min-w-[148px] items-center gap-3 border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? 'border-[#14130F] bg-[#1F4BFF] text-white'
                      : 'border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--accent)]'
                  }`}
                >
                  <span
                    className="h-8 w-8 shrink-0 border-[1.5px] border-[#14130F] shadow-[2px_2px_0_#14130F]"
                    style={{ backgroundColor: item.color.hex }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{item.color.name}</span>
                    <span className={`block text-xs font-mono ${isSelected ? 'text-white/80' : 'text-[color:var(--muted-foreground)]'}`}>
                      {item.color.id} / {item.count} 颗
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
