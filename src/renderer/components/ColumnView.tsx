import { useState, useEffect, useCallback } from 'react'
import { trpc } from '../trpc/client'
import { useExplorerStore } from '../stores/explorerStore'
import { FileNode } from '@shared/types'

interface ColumnProps {
  items: FileNode[]
  selectedPath: string | null
  onSelect: (node: FileNode) => void
  onCheck: (path: string) => void
  getCheckState: (path: string) => 'checked' | 'unchecked' | 'indeterminate'
}

function Column({ items, selectedPath, onSelect, onCheck, getCheckState }: ColumnProps) {
  return (
    <div className="w-64 min-w-[256px] h-full border-r border-gray-700 overflow-y-auto">
      {items.map((node) => {
        const checkState = getCheckState(node.path)
        const isSelected = selectedPath === node.path

        return (
          <div
            key={node.path}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-700 ${
              isSelected ? 'bg-gray-700' : ''
            }`}
            onClick={() => onSelect(node)}
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
              className="w-4 h-4 accent-blue-500"
            />
            <span className={`flex-1 truncate ${node.isDirectory ? 'font-medium' : ''}`}>
              {node.isDirectory ? '📁 ' : '📄 '}
              {node.name}
            </span>
            {node.isDirectory && <span className="text-gray-500">›</span>}
          </div>
        )
      })}
    </div>
  )
}

interface ColumnViewProps {
  rootPath: string
  onFileSelect?: (path: string) => void
}

export function ColumnView({ rootPath, onFileSelect }: ColumnViewProps) {
  const {
    pathStack,
    columns,
    selectedFile,
    pushPath,
    popToIndex,
    setColumns,
    setSelectedFile,
    toggleSelection,
    getEffectiveState
  } = useExplorerStore()

  const [loading, setLoading] = useState(false)

  const loadDirectory = useCallback(async (dirPath: string, columnIndex: number) => {
    setLoading(true)
    try {
      const response = await fetch(`trpc://fs.listDir?input=${encodeURIComponent(JSON.stringify({ path: dirPath }))}`)
      // For now, use a simple approach - the tRPC query will handle this
    } catch (e) {
      console.error('Failed to load directory', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (rootPath && columns.length === 0) {
      // Initial load handled by parent component
    }
  }, [rootPath, columns.length])

  const handleSelect = (node: FileNode, columnIndex: number) => {
    if (node.isDirectory) {
      popToIndex(columnIndex - 1)
      pushPath(node.path)
      setSelectedFile(null)
    } else {
      setSelectedFile(node.path)
      onFileSelect?.(node.path)
    }
  }

  const handleBreadcrumbClick = (index: number) => {
    popToIndex(index)
  }

  const breadcrumbs = [rootPath, ...pathStack]

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-800 border-b border-gray-700 text-sm overflow-x-auto">
        {breadcrumbs.map((path, i) => {
          const name = path.split(/[\\/]/).pop() || path
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

      {/* Columns */}
      <div className="flex-1 flex overflow-x-auto">
        {columns.length === 0 ? (
          <div className="flex items-center justify-center w-full text-gray-500">
            {loading ? 'Loading...' : 'No files to display'}
          </div>
        ) : (
          columns.map((items, i) => (
            <Column
              key={i}
              items={items}
              selectedPath={i === columns.length - 1 ? selectedFile : pathStack[i]}
              onSelect={(node) => handleSelect(node, i)}
              onCheck={toggleSelection}
              getCheckState={getEffectiveState}
            />
          ))
        )}
      </div>
    </div>
  )
}
