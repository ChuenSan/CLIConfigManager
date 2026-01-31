import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '../trpc/client'
import { useExplorerStore } from '../stores/explorerStore'
import { FileNode } from '@shared/types'
import { Folder, File, ChevronRight, FilePlus, FolderPlus } from 'lucide-react'
import { clsx } from 'clsx'
import { ConfirmDialog } from './ConfirmDialog'

interface ColumnProps {
  items: FileNode[]
  selectedName: string | null
  onSelect: (node: FileNode) => void
  onCheck: (path: string) => void
  getCheckState: (path: string) => 'checked' | 'unchecked' | 'indeterminate'
  editingName: string | null
  editValue: string
  onEditChange: (value: string) => void
  onEditConfirm: () => void
  onEditCancel: () => void
}

function Column({ items, selectedName, onSelect, onCheck, getCheckState, editingName, editValue, onEditChange, onEditConfirm, onEditCancel }: ColumnProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingName])

  return (
    <div className="h-full w-56 flex-shrink-0 border-r border-app-border animate-column-in bg-app-bg">
      <div className="h-full overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
      {items.map((node) => {
        const checkState = getCheckState(node.path)
        const isSelected = selectedName === node.name
        const isEditing = editingName === node.name

        return (
          <div
            key={node.name}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 cursor-default text-[13px] select-none transition-colors rounded-md',
              isSelected
                ? 'bg-primary text-white'
                : 'text-app-text hover:bg-app-surface-hover'
            )}
            onClick={() => !isEditing && onSelect(node)}
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
              className={clsx(
                'w-3.5 h-3.5 rounded flex-shrink-0',
                isSelected ? 'accent-white' : 'accent-primary'
              )}
            />
            <span className={clsx(
              'flex-shrink-0',
              isSelected ? 'text-white/80' : 'text-primary'
            )}>
              {node.isDirectory ? <Folder size={16} /> : <File size={16} />}
            </span>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') onEditConfirm()
                  if (e.key === 'Escape') onEditCancel()
                }}
                onBlur={onEditCancel}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 px-1 py-0 bg-app-bg border border-primary rounded text-app-text text-[13px] focus:outline-none"
              />
            ) : (
              <span className={clsx('flex-1 truncate', node.isDirectory && 'font-medium')}>
                {node.name}
              </span>
            )}
            {node.isDirectory && !isEditing && (
              <ChevronRight size={14} className={clsx(
                'flex-shrink-0',
                isSelected ? 'text-white/60' : 'text-app-text-muted'
              )} />
            )}
          </div>
        )
      })}
      </div>
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
  const { t } = useTranslation()
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
    clearSelection,
    selectAll,
    selection
  } = useExplorerStore()

  const utils = trpc.useUtils()
  const loadingRef = useRef(false)
  const columnsContainerRef = useRef<HTMLDivElement>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editingColumnIndex, setEditingColumnIndex] = useState<number>(-1)
  const [editValue, setEditValue] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; paths: string[] } | null>(null)
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null)
  const [createName, setCreateName] = useState('')
  const deleteMutation = trpc.fs.deleteFile.useMutation()
  const renameMutation = trpc.fs.rename.useMutation()
  const createFileMutation = trpc.fs.createFile.useMutation()
  const createFolderMutation = trpc.fs.createFolder.useMutation()

  // Auto-scroll to show new column
  useEffect(() => {
    if (columnsContainerRef.current && columns.length > 1) {
      columnsContainerRef.current.scrollLeft = columnsContainerRef.current.scrollWidth
    }
  }, [columns.length])

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      return await utils.fs.listDir.fetch({ path: dirPath })
    } catch (e) {
      console.error('Failed to load directory:', dirPath, e)
      return []
    }
  }, [utils])

  // Refresh a single column by index
  const refreshColumn = useCallback(async (columnIndex: number) => {
    const dirPath = columnIndex === 0
      ? rootPath
      : joinPath(rootPath, ...pathStack.slice(0, columnIndex))
    const items = await loadDirectory(dirPath)
    const currentColumns = useExplorerStore.getState().columns
    const newColumns = [...currentColumns]
    newColumns[columnIndex] = items
    setColumns(newColumns)
  }, [rootPath, pathStack, loadDirectory, setColumns])

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
      // 选中文件时，截断 pathStack 到当前列，清除后续列
      const newPathStack = pathStack.slice(0, columnIndex)
      setPathStack(newPathStack)
      const fullPath = joinPath(rootPath, ...newPathStack, node.name)
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
    // Priority 1: Delete checked items
    const checkedPaths: string[] = []
    columns.forEach((items, colIndex) => {
      const basePath = colIndex === 0 ? rootPath : joinPath(rootPath, ...pathStack.slice(0, colIndex))
      items.forEach(node => {
        if (selection.get(node.path) === 'checked') {
          checkedPaths.push(joinPath(basePath, node.name))
        }
      })
    })

    if (checkedPaths.length > 0) {
      const names = checkedPaths.map(p => p.split(/[\\/]/).pop()).join(', ')
      setDeleteConfirm({
        message: t('columnView.deleteMultipleConfirm', { count: checkedPaths.length, names }),
        paths: checkedPaths
      })
      return
    }

    // Priority 2: Delete selected file or current directory
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

    setDeleteConfirm({
      message: t('columnView.deleteSingleConfirm', { name: targetName }),
      paths: [targetPath]
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      for (const path of deleteConfirm.paths) {
        const result = await deleteMutation.mutateAsync({ path })
        if (!result.success) {
          alert(t('columnView.deleteFailed'))
          break
        }
      }

      // Determine which column to refresh
      let refreshColumnIndex = pathStack.length

      if (deleteConfirm.paths.length > 1) {
        clearSelection()
      } else if (selectedFile) {
        setSelectedFile(null)
      } else {
        // Deleting current directory - go back one level
        setPathStack(pathStack.slice(0, -1))
        refreshColumnIndex = pathStack.length - 1
      }
      clearSelection()

      // Partial refresh: only refresh the affected column
      if (refreshColumnIndex >= 0) {
        await refreshColumn(refreshColumnIndex)
      }
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  // Count checked items
  const checkedCount = Array.from(selection.values()).filter(v => v === 'checked').length
  const canDelete = checkedCount > 0 || selectedFile || pathStack.length > 0

  // Get items in current active folder for Select All
  const currentFolderItems = columns[pathStack.length] || []
  const currentFolderPaths = currentFolderItems.map(node => node.path)
  const allChecked = currentFolderPaths.length > 0 && currentFolderPaths.every(p => selection.get(p) === 'checked')

  const handleSelectAll = () => {
    if (allChecked) {
      clearSelection()
    } else {
      selectAll(currentFolderPaths)
    }
  }

  // Rename handlers
  const startRename = (name: string, columnIndex: number) => {
    setEditingName(name)
    setEditingColumnIndex(columnIndex)
    setEditValue(name)
  }

  const cancelRename = () => {
    setEditingName(null)
    setEditingColumnIndex(-1)
    setEditValue('')
  }

  const confirmRename = async () => {
    if (!editingName || editingColumnIndex < 0 || !editValue.trim()) {
      cancelRename()
      return
    }
    if (editValue === editingName) {
      cancelRename()
      return
    }

    const basePath = editingColumnIndex === 0 ? rootPath : joinPath(rootPath, ...pathStack.slice(0, editingColumnIndex))
    const oldPath = joinPath(basePath, editingName)

    const result = await renameMutation.mutateAsync({ oldPath, newName: editValue.trim() })
    if (result.success) {
      // Update pathStack if renamed item is in the path
      if (editingColumnIndex < pathStack.length && pathStack[editingColumnIndex] === editingName) {
        const newPathStack = [...pathStack]
        newPathStack[editingColumnIndex] = editValue.trim()
        setPathStack(newPathStack)
      }
      // Update selectedFile if it was the renamed file
      if (selectedFile && selectedFile.endsWith(editingName)) {
        const newPath = joinPath(basePath, editValue.trim())
        setSelectedFile(newPath)
      }
      // Partial refresh: only refresh the column where rename happened
      await refreshColumn(editingColumnIndex)
    } else {
      alert('error' in result ? result.error : t('columnView.renameFailed'))
    }
    cancelRename()
  }

  // F2 key handler - only allow rename when exactly one item is checked
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !editingName && checkedCount === 1) {
        const checkedPath = Array.from(selection.entries())
          .find(([_, state]) => state === 'checked')?.[0]
        if (checkedPath) {
          for (let i = 0; i < columns.length; i++) {
            const item = columns[i].find(node => node.path === checkedPath)
            if (item) {
              startRename(item.name, i)
              return
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingName, checkedCount, selection, columns])

  // Create file/folder handlers
  const startCreate = (type: 'file' | 'folder') => {
    setCreatingType(type)
    setCreateName('')
  }

  const cancelCreate = () => {
    setCreatingType(null)
    setCreateName('')
  }

  const confirmCreate = async () => {
    if (!creatingType || !createName.trim()) {
      cancelCreate()
      return
    }

    const currentDir = joinPath(rootPath, ...pathStack)
    const newPath = joinPath(currentDir, createName.trim())

    const mutation = creatingType === 'file' ? createFileMutation : createFolderMutation
    const result = await mutation.mutateAsync({ path: newPath })

    if (result.success) {
      // Partial refresh: only refresh the current column
      await refreshColumn(pathStack.length)
    } else {
      alert('error' in result ? result.error : t('columnView.createFailed'))
    }
    cancelCreate()
  }

  const breadcrumbs = [rootPath, ...pathStack]

  return (
    <div className="flex flex-col h-full bg-app-bg overflow-hidden">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center gap-2 px-3 py-2 bg-app-surface border-b border-app-border text-sm">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0">
          {breadcrumbs.map((p, i) => {
            const name = p.split(/[\\/]/).pop() || p
            return (
              <span key={i} className="flex items-center whitespace-nowrap">
                {i > 0 && <span className="mx-1 text-app-text-muted">/</span>}
                <button
                  onClick={() => handleBreadcrumbClick(i - 1)}
                  className="hover:text-primary transition-colors truncate max-w-[150px] text-app-text"
                >
                  {name}
                </button>
              </span>
            )
          })}
        </div>
        {rootPath && (
          <>
            <button
              onClick={() => startCreate('file')}
              className="p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-surface-hover rounded-md transition-colors flex-shrink-0"
              title={t('columnView.newFile')}
            >
              <FilePlus size={16} />
            </button>
            <button
              onClick={() => startCreate('folder')}
              className="p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-surface-hover rounded-md transition-colors flex-shrink-0"
              title={t('columnView.newFolder')}
            >
              <FolderPlus size={16} />
            </button>
          </>
        )}
        {currentFolderPaths.length > 0 && (
          <button
            onClick={handleSelectAll}
            className="px-2 py-1 text-xs bg-app-surface-hover text-app-text hover:bg-app-border rounded-md transition-colors flex-shrink-0"
          >
            {allChecked ? t('columnView.deselectAll') : t('columnView.selectAll')}
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 text-xs bg-danger text-white hover:bg-red-600 rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {deleting ? t('columnView.deleting') : checkedCount > 0 ? t('columnView.deleteWithCount', { count: checkedCount }) : t('columnView.delete')}
          </button>
        )}
      </div>

      {/* Columns */}
      <div ref={columnsContainerRef} className="flex-1 flex overflow-x-auto">
        {columns.length === 0 ? (
          <div className="flex items-center justify-center w-full text-app-text-muted">
            {rootPath ? t('columnView.noFiles') : t('columnView.importFirst')}
          </div>
        ) : (
          columns.map((items, i) => {
            if (i > 0 && items.length === 0) return null

            let selectedName: string | null = null
            if (i < pathStack.length) {
              selectedName = pathStack[i]
            } else if (selectedFile && i === columns.length - 1) {
              selectedName = selectedFile.split(/[\\/]/).pop() || null
            }

            return (
              <Column
                key={`${i}-${refreshKey}`}
                items={items}
                selectedName={selectedName}
                onSelect={(node) => handleSelect(node, i)}
                onCheck={toggleSelection}
                getCheckState={getEffectiveState}
                editingName={editingColumnIndex === i ? editingName : null}
                editValue={editValue}
                onEditChange={setEditValue}
                onEditConfirm={confirmRename}
                onEditCancel={cancelRename}
              />
            )
          })
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={t('dialog.confirm')}
        description={deleteConfirm?.message || ''}
        variant="danger"
        confirmLabel={t('dialog.delete')}
        onConfirm={handleDeleteConfirm}
      />

      {/* Create File/Folder Dialog */}
      {creatingType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-app-surface rounded-xl p-6 w-80 border border-app-border shadow-2xl animate-slide-in">
            <h3 className="text-lg font-semibold text-app-text mb-4">
              {creatingType === 'file' ? t('columnView.newFile') : t('columnView.newFolder')}
            </h3>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreate()
                if (e.key === 'Escape') cancelCreate()
              }}
              placeholder={creatingType === 'file' ? t('columnView.fileNamePlaceholder') : t('columnView.folderNamePlaceholder')}
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text placeholder:text-app-text-muted mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelCreate}
                className="px-4 py-2 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors"
              >
                {t('dialog.cancel')}
              </button>
              <button
                onClick={confirmCreate}
                disabled={!createName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {t('dialog.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
