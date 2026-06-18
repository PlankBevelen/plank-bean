export type LayoutExportContext = {
  canExport: boolean
  setCanExport: (enabled: boolean) => void
  setExportAction: (action: (() => void) | null) => void
}
