import type { ShoppingListItem } from '../../types'
import { ListIcon } from '../common/Icons'

type ShoppingListCardProps = {
  shoppingList: ShoppingListItem[]
}

export default function ShoppingListCard({ shoppingList }: ShoppingListCardProps) {
  if (shoppingList.length === 0) {
    return null
  }

  const totalBeads = shoppingList.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-none">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
        <ListIcon className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-bold">Shopping List</h2>
        <span className="ml-auto bg-gray-100 px-2 py-1 text-xs font-mono border border-gray-200">
          Total Beads: {totalBeads}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {shoppingList.map((item) => (
          <div
            key={item.color.id}
            className="flex items-center gap-3 p-2 border border-gray-100 hover:border-[#1F4BFF] transition-colors bg-gray-50/30 group"
          >
            <div
              className="w-8 h-8 rounded-none border-[1.5px] border-[#14130F] shadow-[2px_2px_0_#14130F] flex-shrink-0 relative overflow-hidden"
              style={{ backgroundColor: item.color.hex }}
            >
              <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white/20"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{item.color.name}</p>
              <p className="text-[10px] text-gray-500 font-mono">{item.color.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#1F4BFF] font-mono group-hover:scale-110 transition-transform">
                {item.count}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
