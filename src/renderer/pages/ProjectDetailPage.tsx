import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../stores/projectStore'
import { useExplorerStore } from '../stores/explorerStore'
import { trpc } from '../trpc/client'
import { ColumnView } from '../components/ColumnView'
import { FilePreviewModal } from '../components/FilePreview'
import { BackupManager } from '../components/BackupManager'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ProjectMeta } from '@shared/types'
import { Download, Upload, Archive } from 'lucide-react'

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const { currentProjectName, setCurrentProject } = useProjectStore()
  const { selectedFile, clearSelection, setColumns, setSelectedFile } = useExplorerStore()
  const [selectedCli, setSelectedCli] = useState<string | null>(null)
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null)
  const [showBackups, setShowBackups] = useState(false)
  const [importing, setImporting] = useState(false)
  const [applying, setApplying] = useState(false)
  const [workingCopyPath, setWorkingCopyPath] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showLargeFilesConfirm, setShowLargeFilesConfirm] = useState(false)
  const [largeFilesMessage, setLargeFilesMessage] = useState('')
  const [showApplyConfirm, setShowApplyConfirm] = useState(false)

  const projectQuery = trpc.projects.get.useQuery(
    { name: currentProjectName || '' },
    {
      enabled: !!currentProjectName,
      onSuccess: (data) => {
        setProjectMeta(data)
        setCurrentProject(data)
      }
    }
  )

  const workingCopyQuery = trpc.projects.getWorkingCopyPath.useQuery(
    { projectName: currentProjectName || '', cliName: selectedCli || '' },
    {
      enabled: !!currentProjectName && !!selectedCli,
      onSuccess: (data) => {
        if (data.path) {
          setWorkingCopyPath(data.path)
        }
      }
    }
  )

  const importMutation = trpc.fileOps.import.useMutation()
  const applyMutation = trpc.fileOps.apply.useMutation()

  useEffect(() => {
    if (projectMeta) {
      const clis = Object.keys(projectMeta.linkedCLIs)
      if (clis.length > 0 && !selectedCli) {
        setSelectedCli(clis[0])
      }
    }
  }, [projectMeta, selectedCli])

  // Reset columns when CLI changes
  useEffect(() => {
    setColumns([])
    clearSelection()
    setWorkingCopyPath(null)
    setRefreshKey(k => k + 1)
  }, [selectedCli])

  if (!currentProjectName) {
    return (
      <div className="flex-1 flex items-center justify-center text-app-text-muted bg-app-bg">
        {t('project.selectProject')}
      </div>
    )
  }

  if (projectQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-app-text-muted bg-app-bg">
        {t('project.loading')}
      </div>
    )
  }

  if (!projectMeta) {
    return (
      <div className="flex-1 flex items-center justify-center text-app-text-muted bg-app-bg">
        {t('project.notFound')}
      </div>
    )
  }

  const linkedClis = Object.keys(projectMeta.linkedCLIs)

  const handleImport = async () => {
    if (!selectedCli) return
    setImporting(true)
    try {
      const result = await importMutation.mutateAsync({
        projectName: projectMeta.projectName,
        cliName: selectedCli
      })
      if (result.largeFiles && result.largeFiles.length > 0) {
        const filesText = result.largeFiles.map(f => `${f.path} (${Math.round(f.size / 1024 / 1024)}MB)`).join('\n')
        setLargeFilesMessage(t('project.largeFilesDetected', { files: filesText }))
        setShowLargeFilesConfirm(true)
      } else {
        workingCopyQuery.refetch()
        setRefreshKey(k => k + 1)
      }
    } finally {
      setImporting(false)
    }
  }

  const handleLargeFilesConfirm = async () => {
    setShowLargeFilesConfirm(false)
    setImporting(true)
    try {
      await importMutation.mutateAsync({
        projectName: projectMeta!.projectName,
        cliName: selectedCli!,
        skipLargeFileCheck: true
      })
      workingCopyQuery.refetch()
      setRefreshKey(k => k + 1)
    } finally {
      setImporting(false)
    }
  }

  const handleApply = async () => {
    if (!selectedCli) return
    setShowApplyConfirm(true)
  }

  const handleApplyConfirm = async () => {
    setShowApplyConfirm(false)
    setApplying(true)
    try {
      const result = await applyMutation.mutateAsync({
        projectName: projectMeta!.projectName,
        cliName: selectedCli!
      })
      if (result.success) {
        alert(t('project.applySuccess'))
      } else {
        alert(t('project.applyFailed', { errors: result.errors?.join(', ') }))
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg">
      {/* Header + Actions */}
      <div className="flex items-center gap-4 px-4 py-2 bg-app-surface border-b border-app-border">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-app-text truncate">{projectMeta.projectName}</h1>
          <p className="text-xs text-app-text-muted">
            {t('project.created')} {new Date(projectMeta.createdTime).toLocaleDateString()}
          </p>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-app-text-muted">{t('project.cli')}</span>
            <select
              value={selectedCli || ''}
              onChange={(e) => {
                setSelectedCli(e.target.value || null)
                clearSelection()
              }}
              className="bg-app-bg border border-app-border rounded-md px-2 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {linkedClis.length === 0 && <option value="">{t('project.noClisLinked')}</option>}
              {linkedClis.map((cli) => (
                <option key={cli} value={cli}>{cli}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-app-border" />

          <button
            onClick={handleImport}
            disabled={!selectedCli || importing}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            {importing ? t('project.importing') : t('project.importFromCli')}
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedCli || applying}
            className="flex items-center gap-2 px-3 py-1.5 bg-success-surface text-success rounded-md text-sm font-medium hover:bg-emerald-600/20 border border-emerald-600/20 transition-colors disabled:opacity-50"
          >
            <Upload size={14} />
            {applying ? t('project.applying') : t('project.applyToCli')}
          </button>
          <button
            onClick={() => setShowBackups(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-app-surface-hover text-app-text rounded-md text-sm font-medium hover:bg-app-border transition-colors"
          >
            <Archive size={14} />
            {t('project.backups')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {selectedCli ? (
          <div className="min-w-0 flex-1">
            <ColumnView
              rootPath={workingCopyPath || ''}
              refreshKey={refreshKey}
              onFileSelect={() => {}}
              onRefresh={() => setRefreshKey(k => k + 1)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-app-text-muted">
            {t('project.selectCliToBrowse')}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        filePath={selectedFile}
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        onDelete={() => {
          setSelectedFile(null)
          setRefreshKey(k => k + 1)
        }}
        onSave={() => {}}
      />

      {/* Backup Manager Modal */}
      {showBackups && (
        <BackupManager
          projectName={projectMeta.projectName}
          linkedClis={linkedClis}
          onClose={() => setShowBackups(false)}
        />
      )}

      {/* Large Files Confirm Dialog */}
      <ConfirmDialog
        open={showLargeFilesConfirm}
        onOpenChange={setShowLargeFilesConfirm}
        title={t('dialog.confirm')}
        description={largeFilesMessage}
        onConfirm={handleLargeFilesConfirm}
      />

      {/* Apply Confirm Dialog */}
      <ConfirmDialog
        open={showApplyConfirm}
        onOpenChange={setShowApplyConfirm}
        title={t('dialog.confirm')}
        description={t('project.applyConfirm')}
        onConfirm={handleApplyConfirm}
      />
    </div>
  )
}
