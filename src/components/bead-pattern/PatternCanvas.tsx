import { ImageIcon } from '../common/Icons'

type PatternCanvasProps = {
  imageSrc: string | null
  isProcessing: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export default function PatternCanvas({
  imageSrc,
  isProcessing,
  canvasRef,
}: PatternCanvasProps) {
  return (
    <div className="bg-white border-[1.5px] border-[#14130F] shadow-[4px_4px_0_#14130F] p-4 h-[600px] overflow-auto rounded-none relative custom-scrollbar">
      {!imageSrc ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
          <div className="w-16 h-16 border border-gray-200 flex items-center justify-center opacity-50">
            <ImageIcon className="w-6 h-6" />
          </div>
          <p className="font-mono text-sm uppercase tracking-widest">Waiting for input</p>
        </div>
      ) : (
        <div className="w-fit h-fit m-auto">
          <div className="relative border border-gray-200 bg-white shadow-sm p-4">
            <canvas
              ref={canvasRef}
              className="block bg-white"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
          <div className="font-mono text-[#1F4BFF] font-bold animate-pulse">PROCESSING...</div>
        </div>
      )}
    </div>
  )
}
