import { useState, useEffect, useCallback, useRef } from 'react'
import { trpc } from '../trpc/client'
import { useExplorerStore } from '../stores/explorerStore'
import { FileNode } from '@shared/types'

interface ColumnProps {
  items: FileNode[]
  selectedName: string | null
  onSelect: (node: FileNode) => void
  onCheck: (path: string) => void
  getCheckState: (path: string) => 'checked' | 'unchecked' | 'indeterminate'
  width: number
  onResize: (delta: number) => void
  onResizeEnd: () => void
  isLast: boolean
}

function Column({ items, selectedName, onSelect, onCheck, getCheckState, width, onResize, onResizeEnd, isLast }: ColumnProps) {
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startWidth: width }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizeRef.current) return
    const delta = e.clientX - resizeRef.current.startX
    onResize(delta)
  }

  const handleMouseUp = () => {
    resizeRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    onResizeEnd()
  }

  return (
    <div className="relative h-full flex-shrink-0" style={{ width: `${width}px`, minWidth: '120px' }}>
      <div className="h-full border-r border-gray-700 overflow-y-auto overflow-x-hidden">
      {items.map((node) => {
        const checkState = getCheckState(node.path)
        const isSelected = selectedName === node.name

        return (
          <div
            key={node.name}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-700 ${
              isSelected ? 'bg-gray-700' : ''
            }`}
            onClick={() => onSelect(node)}
            title={node.name}
          >
            <input
              type="checkbox"
              checked={checkState === 'checked'}
              ref={(el) => {
                if (el) el.indeterminate = checkState === 'indeterminate'
              }}
              onChange={(e) => {
                e.stopPropagation()
                onCheck(node.path)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 accent-blue-500 flex-shrink-0"
            />
            <span className={`flex-1 truncate ${node.isDirectory ? 'font-medium' : ''}`}>
              {node.isDirectory ? '📁 ' : '📄 '}
              {node.name}
            </span>
            {node.isDirectory && <span className="text-gray-500 flex-shrink-0">›</span>}
          </div>
        )
      })}
      </div>
      {!isLast && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 z-10"
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  )
}

interface ColumnViewProps {
  rootPath: string
  refreshKey?: number
  onFileSelect?: (path: string) => void
  onRefresh?: () => void
}

// Helper to join paths correctly for the current OS
function joinPath(base: string, ...parts: string[]): string {
  if (parts.length === 0) return base
  const sep = base.includes('\\') ? '\\' : '/'
  return [base, ...parts.filter(p => p)].join(sep)
}

export function ColumnView({ rootPath, refreshKey = 0, onFileSelect, onRefresh }: ColumnViewProps) {
  const {
    pathStack,
    columns,
    selectedFile,
    setPathStack,
    setColumns,
    setSelectedFile,
    toggleSelection,
    getEffectiveState,
    clearPathStack,
    clearSelection
  } = useExplorerStore()

  const utils = trpc.useUtils()
  const loadingRef = useRef(false)
  const columnsContainerRef = useRef<HTMLDivElement>(null)
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const baseWidthRef = useRef<number[]>([])
  const [deleting, setDeleting] = useState(false)
  const deleteMutation = trpc.fs.deleteFile.useMutation()

  // Sync column widths with columns count
  useEffect(() => {
    if (columns.length !== columnWidths.length) {
      const newWidths = columns.map((_, i) => columnWidths[i] || 220)
      setColumnWidths(newWidths)
      baseWidthRef.current = newWidths
    }
  }, [columns.length])

  // Auto-scroll to show new column
  useEffect(() => {
    if (columnsContainerRef.current && columns.length > 1) {
      columnsContainerRef.current.scrollLeft = columnsContainerRef.current.scrollWidth
    }
  }, [columns.length])

  const handleColumnResize = (index: number, delta: number) => {
    setColumnWidths(prev => {
      const newWidths = [...prev]
      newWidths[index] = Math.max(120, (baseWidthRef.current[index] || 220) + delta)
      return newWidths
    })
  }

  const finalizeResize = () => {
    baseWidthRef.current = [...columnWidths]
  }

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      return await utils.fs.listDir.fetch({ path: dirPath })
    } catch (e) {
      console.error('Failed to load directory:', dirPath, e)
      return []
    }
  }, [utils])

  // Load all columns based on pathStack
  const loadAllColumns = useCallback(async () => {
    if (!rootPath || loadingRef.current) return
    loadingRef.current = true

    try {
      const currentPathStack = useExplorerStore.getState().pathStack
      const newColumns: FileNode[][] = []

      const rootItems = await loadDirectory(rootPath)
      newColumns.push(rootItems)

      for (let i = 0; i < currentPathStack.length; i++) {
        const subPath = joinPath(rootPath, ...currentPathStack.slice(0, i + 1))
        const items = await loadDirectory(subPath)
        newColumns.push(items)
      }

      setColumns(newColumns)
    } finally {
      loadingRef.current = false
    }
  }, [rootPath, loadDirectory, setColumns])

  // Load when rootPath or refreshKey changes
  useEffect(() => {
    if (rootPath) {
      // Reset path stack first, then load
      clearPathStack()
    } else {
      setColumns([])
    }
  }, [rootPath, refreshKey])

  // Load columns when pathStack or rootPath changes
  useEffect(() => {
    if (rootPath) {
      loadAllColumns()
    }
  }, [rootPath, pathStack.join('/'), refreshKey])

  const handleSelect = (node: FileNode, columnIndex: number) => {
    if (node.isDirectory) {
      const newPathStack = [...pathStack.slice(0, columnIndex), node.name]
      setPathStack(newPathStack)
      setSelectedFile(null)
    } else {
      const pathParts = pathStack.slice(0, columnIndex)
      const fullPath = joinPath(rootPath, ...pathParts, node.name)
      setSelectedFile(fullPath)
      onFileSelect?.(fullPath)
    }
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index < 0) {
      clearPathStack()
    } else {
      setPathStack(pathStack.slice(0, index))
    }
    setSelectedFile(null)
  }

  const handleDelete = async () => {
    // Get selected file or current directory from pathStack
    let targetPath: string | null = null
    let targetName: string | null = null

    if (selectedFile) {
      targetPath = selectedFile
      targetName = selectedFile.split(/[\\/]/).pop() || null
    } else if (pathStack.length > 0) {
      targetPath = joinPath(rootPath, ...pathStack)
      targetName = pathStack[pathStack.length - 1]
    }

    if (!targetPath || !targetName) return

    const confirmed = confirm(`Delete "${targetName}"? This action cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    try {
      const result = await deleteMutation.mutateAsync({ path: targetPath })
      if (result.success) {
        if (selectedFile) {
          setSelectedFile(null)
        } else {
          setPathStack(pathStack.slice(0, -1))
        }
        clearSelection()
        onRefresh?.()
      } else {
        alert('Failed to delete')
      }
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = selectedFile || pathStack.length > 0

  const breadcrumbs = [rootPath, ...pathStack]

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Breadcrumb + Delete Button */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-800 border-b border-gray-700 text-sm overflow-x-auto">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {breadcrumbs.map((p, i) => {
            const name = p.split(/[\\/]/).pop() || p
            return (
              <span key={i} className="flex items-center whitespace-nowrap">
                {i > 0 && <span className="mx-1 text-gray-500">/</span>}
                <button
                  onClick={() => handleBreadcrumbClick(i - 1)}
                  className="hover:text-blue-400 truncate max-w-[150px]"
                >
                  {name}
                </button>
              </span>
            )
          })}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 flex-shrink-0"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {/* Columns */}
      <div ref={columnsContainerRef} className="flex-1 flex overflow-x-auto">
        {columns.length === 0 ? (
          <div className="flex items-center justify-center w-full text-gray-500">
            {rootPath ? 'No files to display' : 'Import files first'}
          </div>
        ) : (
          columns.map((items, i) => {
            // Skip empty columns (except the first one)
            if (i > 0 && items.length === 0) return null

            // Determine which item is selected in this column
            let selectedName: string | null = null
            if (i < pathStack.length) {
              selectedName = pathStack[i]
            } else if (selectedFile && i === columns.length - 1) {
              selectedName = selectedFile.split(/[\\/]/).pop() || null
            }

            // Find the actual last visible column
            const isLastVisible = columns.slice(i + 1).every(col => col.length === 0)

            return (
              <Column
                key={`${i}-${refreshKey}`}
                items={items}
                selectedName={selectedName}
                onSelect={(node) => handleSelect(node, i)}
                onCheck={toggleSelection}
                getCheckState={getEffectiveState}
                width={columnWidths[i] || 220}
                onResize={(delta) => handleColumnResize(i, delta)}
                onResizeEnd={finalizeResize}
                isLast={isLastVisible}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
