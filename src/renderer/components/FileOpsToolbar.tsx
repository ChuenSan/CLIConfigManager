import { useState } from 'react'
import { trpc } from '../trpc/client'
import { useExplorerStore } from '../stores/explorerStore'

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
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
      <button
        onClick={handleImport}
        disabled={selectedPaths.length === 0 || importing}
        className="px-3 py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {importing ? 'Importing...' : `Import (${selectedPaths.length})`}
      </button>
      <button
        onClick={handleBackup}
        disabled={backing}
        className="px-3 py-1.5 bg-gray-700 rounded text-sm hover:bg-gray-600 disabled:opacity-50"
      >
        {backing ? 'Backing up...' : 'Backup'}
      </button>
      <button
        onClick={handleApply}
        className="px-3 py-1.5 bg-green-600 rounded text-sm hover:bg-green-700"
      >
        Apply to CLI
      </button>
      <button
        onClick={handleRestore}
        className="px-3 py-1.5 bg-yellow-600 rounded text-sm hover:bg-yellow-700"
      >
        Restore from CLI
      </button>
    </div>
  )
}
