import { useState } from 'react'
import { trpc } from '../trpc/client'
import { useExplorerStore } from '../stores/explorerStore'
import { Download, Save, Upload, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'

interface FileOpsToolbarProps {
  projectName: string
  cliName: string
  onRestoreRequest?: () => void
}

export function FileOpsToolbar({ projectName, cliName, onRestoreRequest }: FileOpsToolbarProps) {
  const { selection } = useExplorerStore()
  const [importing, setImporting] = useState(false)
  const [backing, setBacking] = useState(false)

  const importMutation = trpc.fileOps.import.useMutation()
  const backupMutation = trpc.fileOps.backup.useMutation()
  const applyMutation = trpc.fileOps.apply.useMutation()

  const selectedPaths = Array.from(selection.entries())
    .filter(([_, state]) => state === 'checked')
    .map(([path]) => path)

  const handleImport = async () => {
    setImporting(true)
    await importMutation.mutateAsync({
      projectName,
      cliName
    })
    setImporting(false)
  }

  const handleBackup = async () => {
    setBacking(true)
    await backupMutation.mutateAsync({ projectName, cliNames: [cliName] })
    setBacking(false)
  }

  const handleApply = async () => {
    await applyMutation.mutateAsync({ projectName, cliName, selectedPaths })
  }

  const handleRestore = () => {
    onRestoreRequest?.()
  }

  return (
    <div className="h-12 flex items-center gap-2 px-4 bg-app-surface border-b border-app-border">
      <div className="flex items-center bg-app-bg rounded-lg p-1 border border-app-border">
        <button
          onClick={handleImport}
          disabled={selectedPaths.length === 0 || importing}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            'bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download size={14} />
          {importing ? 'Importing...' : `Import (${selectedPaths.length})`}
        </button>
        <div className="w-px h-4 bg-app-border mx-1" />
        <button
          onClick={handleBackup}
          disabled={backing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-app-text-muted hover:text-app-text hover:bg-app-surface-hover transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {backing ? 'Backing up...' : 'Backup'}
        </button>
      </div>

      <div className="flex-1" />

      <button
        onClick={handleRestore}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20 border border-yellow-600/20 transition-colors"
      >
        <RotateCcw size={14} />
        Restore
      </button>
      <button
        onClick={handleApply}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-success-surface text-success hover:bg-emerald-600/20 border border-emerald-600/20 transition-colors"
      >
        <Upload size={14} />
        Apply to CLI
      </button>
    </div>
  )
}
