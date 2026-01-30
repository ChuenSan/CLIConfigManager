import { create } from 'zustand'
import { FileNode } from '@shared/types'

interface ExplorerState {
  pathStack: string[]
  columns: FileNode[][]
  selectedFile: string | null
  selection: Map<string, 'checked' | 'unchecked'>
  pushPath: (path: string) => void
  popToIndex: (index: number) => void
  setPathStack: (pathStack: string[]) => void
  clearPathStack: () => void
  setColumns: (columns: FileNode[][]) => void
  setSelectedFile: (path: string | null) => void
  toggleSelection: (path: string) => void
  selectAll: (paths: string[]) => void
  clearSelection: () => void
  getEffectiveState: (path: string) => 'checked' | 'unchecked' | 'indeterminate'
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  pathStack: [],
  columns: [],
  selectedFile: null,
  selection: new Map(),

  pushPath: (path) => set((state) => ({
    pathStack: [...state.pathStack, path]
  })),

  popToIndex: (index) => set((state) => ({
    pathStack: index < 0 ? [] : state.pathStack.slice(0, index + 1)
  })),

  setPathStack: (pathStack) => set({ pathStack }),

  clearPathStack: () => set({ pathStack: [] }),

  setColumns: (columns) => set({ columns }),

  setSelectedFile: (path) => set({ selectedFile: path }),

  toggleSelection: (path) => set((state) => {
    const newSelection = new Map(state.selection)
    const current = get().getEffectiveState(path)

    if (current === 'checked') {
      newSelection.set(path, 'unchecked')
    } else {
      newSelection.set(path, 'checked')
    }

    return { selection: newSelection }
  }),

  selectAll: (paths) => set((state) => {
    const newSelection = new Map(state.selection)
    for (const path of paths) {
      newSelection.set(path, 'checked')
    }
    return { selection: newSelection }
  }),

  clearSelection: () => set({ selection: new Map() }),

  getEffectiveState: (path) => {
    const { selection } = get()

    // Check exact match
    if (selection.has(path)) {
      return selection.get(path)!
    }

    // Check ancestors (nearest wins) - handle both / and \ separators
    const sep = path.includes('\\') ? '\\' : '/'
    const parts = path.split(sep)
    for (let i = parts.length - 1; i >= 0; i--) {
      const ancestor = parts.slice(0, i).join(sep)
      if (ancestor && selection.has(ancestor)) {
        return selection.get(ancestor)!
      }
    }

    return 'unchecked'
  }
}))
