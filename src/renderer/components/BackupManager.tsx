import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '../trpc/client'
import { SnapshotMeta } from '@shared/types'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { ConfirmDialog } from './ConfirmDialog'

interface BackupManagerProps {
  projectName: string
  linkedClis: string[]
  onClose: () => void
}

export function BackupManager({ projectName, linkedClis, onClose }: BackupManagerProps) {
  const { t } = useTranslation()
  const [selectedCli, setSelectedCli] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<SnapshotMeta | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

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

  const handleRestoreClick = (snapshot: SnapshotMeta) => {
    if (snapshot.snapshotType === 'partial' && !selectedCli) {
      alert(t('backup.partialSnapshotWarning'))
      return
    }
    setRestoreTarget(snapshot)
  }

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const result = await restoreMutation.mutateAsync({
        projectName,
        timestamp: restoreTarget.timestamp,
        cliName: selectedCli || undefined
      })
      if (result.success) {
        alert(t('backup.restoreSuccess'))
      } else {
        alert(t('backup.restoreFailed', { errors: result.errors?.join(', ') }))
      }
    } finally {
      setRestoring(false)
      setRestoreTarget(null)
    }
  }

  const handleDeleteClick = (timestamp: string) => {
    setDeleteTarget(timestamp)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync({ projectName, timestamp: deleteTarget })
    setDeleteTarget(null)
  }

  const formatTimestamp = (ts: string) => {
    const year = ts.slice(0, 4)
    const month = ts.slice(4, 6)
    const day = ts.slice(6, 8)
    const hour = ts.slice(8, 10)
    const min = ts.slice(10, 12)
    const sec = ts.slice(12, 14)
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`
  }

  return (
    <>
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-surface rounded-xl w-[600px] max-h-[80vh] flex flex-col border border-app-border shadow-2xl animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
            <Dialog.Title className="text-lg font-semibold text-app-text">{t('backup.title')}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-app-text-muted hover:text-app-text transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-app-border">
            <button
              onClick={handleBackup}
              disabled={backupMutation.isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              {backupMutation.isLoading ? t('backup.creating') : t('backup.createBackup')}
            </button>

            <div className="flex-1" />

            <span className="text-sm text-app-text-muted">{t('backup.restoreTo')}</span>
            <select
              value={selectedCli || ''}
              onChange={(e) => setSelectedCli(e.target.value || null)}
              className="bg-app-bg border border-app-border rounded-md px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('backup.allClis')}</option>
              {linkedClis.map((cli) => (
                <option key={cli} value={cli}>{cli}</option>
              ))}
            </select>
          </div>

          {/* Snapshot List */}
          <div className="flex-1 overflow-y-auto p-4">
            {snapshotsQuery.isLoading ? (
              <p className="text-app-text-muted text-center">{t('backup.loading')}</p>
            ) : snapshots.length === 0 ? (
              <p className="text-app-text-muted text-center">{t('backup.noBackups')}</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.timestamp}
                    className="bg-app-bg rounded-lg p-3 flex items-start gap-3 border border-app-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-app-text">{formatTimestamp(snapshot.timestamp)}</span>
                        <span className={clsx(
                          'text-xs px-1.5 py-0.5 rounded',
                          snapshot.snapshotType === 'full'
                            ? 'bg-success-surface text-success'
                            : 'bg-yellow-600/20 text-yellow-400'
                        )}>
                          {snapshot.snapshotType}
                        </span>
                        <span className="text-xs text-app-text-muted">
                          {snapshot.source.replace(/-/g, ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-app-text-muted mt-1">
                        {t('backup.clis')} {snapshot.includedCLIs.join(', ')}
                      </div>
                      {snapshot.notes && (
                        <div className="text-sm text-app-text-muted mt-1">{snapshot.notes}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestoreClick(snapshot)}
                        disabled={restoring}
                        className="flex items-center gap-1 px-2 py-1 bg-yellow-600/10 text-yellow-400 rounded-md text-xs hover:bg-yellow-600/20 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {t('backup.restore')}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(snapshot.timestamp)}
                        disabled={deleteMutation.isLoading}
                        className="flex items-center gap-1 px-2 py-1 bg-danger-surface text-danger rounded-md text-xs hover:bg-danger/20 transition-colors"
                      >
                        <Trash2 size={12} />
                        {t('backup.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-app-border text-xs text-app-text-muted">
            {t('backup.maxBackupsNote')}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <ConfirmDialog
      open={!!restoreTarget}
      onOpenChange={(open) => !open && setRestoreTarget(null)}
      title={t('dialog.confirm')}
      description={t('backup.restoreConfirm')}
      variant="danger"
      onConfirm={handleRestoreConfirm}
    />

    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(open) => !open && setDeleteTarget(null)}
      title={t('dialog.confirm')}
      description={t('backup.deleteConfirm')}
      variant="danger"
      confirmLabel={t('dialog.delete')}
      onConfirm={handleDeleteConfirm}
    />
    </>
  )
}
