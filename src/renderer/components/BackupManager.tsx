import { useState } from 'react'
import { trpc } from '../trpc/client'
import { SnapshotMeta } from '@shared/types'

interface BackupManagerProps {
  projectName: string
  linkedClis: string[]
  onClose: () => void
}

export function BackupManager({ projectName, linkedClis, onClose }: BackupManagerProps) {
  const [selectedCli, setSelectedCli] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  const snapshotsQuery = trpc.fileOps.listSnapshots.useQuery({ projectName })
  const backupMutation = trpc.fileOps.backup.useMutation({
    onSuccess: () => snapshotsQuery.refetch()
  })
  const deleteMutation = trpc.fileOps.deleteSnapshot.useMutation({
    onSuccess: () => snapshotsQuery.refetch()
  })
  const restoreMutation = trpc.fileOps.restore.useMutation()

  const snapshots = snapshotsQuery.data || []

  const handleBackup = async () => {
    if (linkedClis.length === 0) return
    await backupMutation.mutateAsync({
      projectName,
      cliNames: linkedClis
    })
  }

  const handleRestore = async (snapshot: SnapshotMeta) => {
    // Check partial snapshot constraint (BR-10)
    if (snapshot.snapshotType === 'partial' && !selectedCli) {
      alert('Partial snapshots can only restore specific CLIs. Please select a CLI first.')
      return
    }

    const warning = 'WARNING: Restore will ignore current Ignore Rules.\n\nThis will overwrite your current CLI configuration. Continue?'
    if (!confirm(warning)) return

    setRestoring(true)
    try {
      const result = await restoreMutation.mutateAsync({
        projectName,
        timestamp: snapshot.timestamp,
        cliName: selectedCli || undefined
      })
      if (result.success) {
        alert('Restore completed successfully!')
      } else {
        alert(`Restore failed: ${result.errors?.join(', ')}`)
      }
    } finally {
      setRestoring(false)
    }
  }

  const handleDelete = async (timestamp: string) => {
    if (!confirm('Delete this backup?')) return
    await deleteMutation.mutateAsync({ projectName, timestamp })
  }

  const formatTimestamp = (ts: string) => {
    // yyyyMMddHHmmssSSS -> readable format
    const year = ts.slice(0, 4)
    const month = ts.slice(4, 6)
    const day = ts.slice(6, 8)
    const hour = ts.slice(8, 10)
    const min = ts.slice(10, 12)
    const sec = ts.slice(12, 14)
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Backup Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <button
            onClick={handleBackup}
            disabled={backupMutation.isLoading}
            className="px-3 py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {backupMutation.isLoading ? 'Creating...' : 'Create Backup'}
          </button>

          <div className="flex-1" />

          <span className="text-sm text-gray-400">Restore to:</span>
          <select
            value={selectedCli || ''}
            onChange={(e) => setSelectedCli(e.target.value || null)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
          >
            <option value="">All CLIs</option>
            {linkedClis.map((cli) => (
              <option key={cli} value={cli}>{cli}</option>
            ))}
          </select>
        </div>

        {/* Snapshot List */}
        <div className="flex-1 overflow-y-auto p-4">
          {snapshotsQuery.isLoading ? (
            <p className="text-gray-400 text-center">Loading...</p>
          ) : snapshots.length === 0 ? (
            <p className="text-gray-400 text-center">No backups yet</p>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.timestamp}
                  className="bg-gray-700 rounded p-3 flex items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatTimestamp(snapshot.timestamp)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        snapshot.snapshotType === 'full'
                          ? 'bg-green-600/30 text-green-400'
                          : 'bg-yellow-600/30 text-yellow-400'
                      }`}>
                        {snapshot.snapshotType}
                      </span>
                      <span className="text-xs text-gray-400">
                        {snapshot.source.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      CLIs: {snapshot.includedCLIs.join(', ')}
                    </div>
                    {snapshot.notes && (
                      <div className="text-sm text-gray-500 mt-1">{snapshot.notes}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(snapshot)}
                      disabled={restoring}
                      className="px-2 py-1 bg-yellow-600 rounded text-xs hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(snapshot.timestamp)}
                      disabled={deleteMutation.isLoading}
                      className="px-2 py-1 bg-red-600/30 text-red-400 rounded text-xs hover:bg-red-600/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
          Max 5 backups per project. Oldest backups are auto-deleted.
        </div>
      </div>
    </div>
  )
}
