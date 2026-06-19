import { ImageIcon, TrashIcon, UploadIcon } from '../common/Icons'

type SourceImageCardProps = {
  imageSrc: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

export default function SourceImageCard({
  imageSrc,
  fileInputRef,
  onUpload,
  onClear,
}: SourceImageCardProps) {
  return (
    <div className="bg-white border border-gray-200 p-6 rounded-none">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
        <ImageIcon className="w-5 h-5 text-[#1F4BFF]" />
        <h2 className="text-lg font-bold">原图</h2>
      </div>

      {!imageSrc ? (
        <div
          className="border-2 border-dashed border-gray-300 hover:border-[#1F4BFF] bg-gray-50/50 transition-colors p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 bg-white border border-gray-200 shadow-sm flex items-center justify-center group-hover:border-[#1F4BFF] group-hover:text-[#1F4BFF] transition-colors">
            <UploadIcon className="w-5 h-5" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">点击上传图片</p>
            <p className="text-xs text-gray-500 mt-1">支持 PNG、JPG，大小不超过 5MB</p>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <img
            src={imageSrc}
            alt="原图预览"
            className="w-full h-auto max-h-48 object-contain bg-gray-50 border border-gray-200"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 bg-white border-[1.5px] border-[#14130F] shadow-[2px_2px_0_#14130F] p-2 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <TrashIcon className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onUpload}
      />
    </div>
  )
}
