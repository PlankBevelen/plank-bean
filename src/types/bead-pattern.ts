export type BeadColor = {
  hex: string
  name: string
  id: string
}

export type ShoppingListItem = {
  color: BeadColor
  count: number
}

export type PatternCell = {
  r: number
  g: number
  b: number
  colorId?: string
}

export type ProcessedPattern = {
  width: number
  height: number
  cells: PatternCell[]
  shoppingList: ShoppingListItem[]
}
