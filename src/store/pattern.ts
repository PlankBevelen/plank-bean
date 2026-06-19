import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import type {
  PatternExportFormat,
  PatternProcessingOptions,
  ProcessedPattern,
} from '../types'
import {
  DEFAULT_PATTERN_PROCESSING_OPTIONS,
  updatePatternCellColor,
} from '../utils'
import {
  readPersistedValue,
  removePersistedValue,
  writePersistedValue,
} from './persistence'

const PERSIST_KEY = 'plank-bean-pattern-store'

type PatternStoreState = {
  hasHydrated: boolean
  imageSrc: string | null
  gridSize: number
  processingOptions: PatternProcessingOptions
  pattern: ProcessedPattern | null
  isProcessing: boolean
  isFullscreen: boolean
  isEditMode: boolean
  selectedColorId: string | null
  exportFormat: PatternExportFormat
  exportError: string | null
}

type PatternStoreActions = {
  setHasHydrated: (hasHydrated: boolean) => void
  setImageSrc: (imageSrc: string | null) => void
  setGridSize: (gridSize: number) => void
  updateProcessingOptions: (patch: Partial<PatternProcessingOptions>) => void
  setPattern: (pattern: ProcessedPattern | null) => void
  updatePatternCell: (cellIndex: number, colorId: string) => void
  setIsProcessing: (isProcessing: boolean) => void
  setIsFullscreen: (isFullscreen: boolean) => void
  setIsEditMode: (isEditMode: boolean) => void
  setSelectedColorId: (selectedColorId: string | null) => void
  setExportFormat: (exportFormat: PatternExportFormat) => void
  setExportError: (exportError: string | null) => void
  clearExportError: () => void
  clearPatternSession: () => void
}

export type PatternStore = PatternStoreState & PatternStoreActions

type PersistedPatternStore = Pick<
  PatternStoreState,
  'imageSrc' | 'gridSize' | 'processingOptions' | 'pattern' | 'selectedColorId' | 'exportFormat'
>

const initialState: PatternStoreState = {
  hasHydrated: false,
  imageSrc: null,
  gridSize: 48,
  processingOptions: DEFAULT_PATTERN_PROCESSING_OPTIONS,
  pattern: null,
  isProcessing: false,
  isFullscreen: false,
  isEditMode: false,
  selectedColorId: null,
  exportFormat: 'png',
  exportError: null,
}

const patternStorage: StateStorage = {
  getItem: async (name) => readPersistedValue(name),
  setItem: async (name, value) => {
    await writePersistedValue(name, value)
  },
  removeItem: async (name) => {
    await removePersistedValue(name)
  },
}

export const usePatternStore = create<PatternStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setHasHydrated(hasHydrated) {
        set({ hasHydrated })
      },
      setImageSrc(imageSrc) {
        set({
          imageSrc,
          pattern: imageSrc ? get().pattern : null,
          exportError: null,
        })
      },
      setGridSize(gridSize) {
        set({ gridSize })
      },
      updateProcessingOptions(patch) {
        set((currentState) => ({
          processingOptions: {
            ...currentState.processingOptions,
            ...patch,
          },
        }))
      },
      setPattern(pattern) {
        set({ pattern })
      },
      updatePatternCell(cellIndex, colorId) {
        const currentPattern = get().pattern
        if (!currentPattern) {
          return
        }
        set({
          pattern: updatePatternCellColor(currentPattern, cellIndex, colorId),
        })
      },
      setIsProcessing(isProcessing) {
        set({ isProcessing })
      },
      setIsFullscreen(isFullscreen) {
        set({ isFullscreen })
      },
      setIsEditMode(isEditMode) {
        set({ isEditMode })
      },
      setSelectedColorId(selectedColorId) {
        set({ selectedColorId })
      },
      setExportFormat(exportFormat) {
        set({ exportFormat })
      },
      setExportError(exportError) {
        set({ exportError })
      },
      clearExportError() {
        set({ exportError: null })
      },
      clearPatternSession() {
        set({
          imageSrc: null,
          pattern: null,
          isProcessing: false,
          isFullscreen: false,
          isEditMode: false,
          selectedColorId: null,
          exportError: null,
        })
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => patternStorage),
      partialize: (currentState): PersistedPatternStore => ({
        imageSrc: currentState.imageSrc,
        gridSize: currentState.gridSize,
        processingOptions: currentState.processingOptions,
        pattern: currentState.pattern,
        selectedColorId: currentState.selectedColorId,
        exportFormat: currentState.exportFormat,
      }),
      onRehydrateStorage: () => (currentState, error) => {
        if (error) {
          console.error('恢复拼豆图纸数据失败', error)
        }
        currentState?.setHasHydrated(true)
      },
    },
  ),
)
