import { useState, useEffect } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { useExplorerStore } from '../stores/explorerStore'
import { trpc } from '../trpc/client'
import { ColumnView } from '../components/ColumnView'
import { FilePreview } from '../components/FilePreview'
import { BackupManager } from '../components/BackupManager'
import { ProjectMeta } from '@shared/types'

export function ProjectDetailPage() {
  const { currentProjectName, setCurrentProject } = useProjectStore()
  const { selectedFile, clearSelection } = useExplorerStore()
  const [selectedCli, setSelectedCli] = useState<string | null>(null)
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null)
  const [showBackups, setShowBackups] = useState(false)
  const [importing, setImporting] = useState(false)
  const [applying, setApplying] = useState(false)

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

  if (!currentProjectName) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a project from the list
      </div>
    )
  }

  if (projectQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Loading project...
      </div>
    )
  }

  if (!projectMeta) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Project not found
      </div>
    )
  }

  const linkedClis = Object.keys(projectMeta.linkedCLIs)
  const currentCliPath = selectedCli && projectMeta.linkedCLIs[selectedCli]
    ? projectMeta.linkedCLIs[selectedCli].snapshotInstallPath
    : null

  const handleImport = async () => {
    if (!selectedCli) return
    setImporting(true)
    try {
      const result = await importMutation.mutateAsync({
        projectName: projectMeta.projectName,
        cliName: selectedCli
      })
      if (result.largeFiles && result.largeFiles.length > 0) {
        const proceed = confirm(
          `Large files detected:\n${result.largeFiles.map(f => `${f.path} (${Math.round(f.size / 1024 / 1024)}MB)`).join('\n')}\n\nProceed anyway?`
        )
        if (proceed) {
          await importMutation.mutateAsync({
            projectName: projectMeta.projectName,
            cliName: selectedCli,
            skipLargeFileCheck: true
          })
        }
      }
    } finally {
      setImporting(false)
    }
  }

  const handleApply = async () => {
    if (!selectedCli) return
    const confirmed = confirm(
      'This will:\n1. Create a backup of current CLI config\n2. Apply your changes to the CLI\n\nProceed?'
    )
    if (!confirmed) return

    setApplying(true)
    try {
      const result = await applyMutation.mutateAsync({
        projectName: projectMeta.projectName,
        cliName: selectedCli
      })
      if (result.success) {
        alert('Changes applied successfully!')
      } else {
        alert(`Apply failed: ${result.errors?.join(', ')}`)
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-semibold">{projectMeta.projectName}</h1>
        <p className="text-sm text-gray-400">
          Created: {new Date(projectMeta.createdTime).toLocaleDateString()}
        </p>
      </div>

      {/* CLI Selector + Actions */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-850 border-b border-gray-700">
        <span className="text-sm text-gray-400">CLI:</span>
        <select
          value={selectedCli || ''}
          onChange={(e) => {
            setSelectedCli(e.target.value || null)
            clearSelection()
          }}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
        >
          {linkedClis.length === 0 && <option value="">No CLIs linked</option>}
          {linkedClis.map((cli) => (
            <option key={cli} value={cli}>{cli}</option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={handleImport}
          disabled={!selectedCli || importing}
          className="px-3 py-1.5 bg-blue-600 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {importing ? 'Importing...' : 'Import from CLI'}
        </button>
        <button
          onClick={handleApply}
          disabled={!selectedCli || applying}
          className="px-3 py-1.5 bg-green-600 rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {applying ? 'Applying...' : 'Apply to CLI'}
        </button>
        <button
          onClick={() => setShowBackups(true)}
          className="px-3 py-1.5 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          Backups
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {selectedCli ? (
          <>
            <div className="flex-1 min-w-0">
              <ColumnView
                rootPath={currentCliPath || ''}
                onFileSelect={() => {}}
              />
            </div>
            <div className="w-1/2 border-l border-gray-700">
              <FilePreview filePath={selectedFile} className="h-full" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a CLI to browse files
          </div>
        )}
      </div>

      {/* Backup Manager Modal */}
      {showBackups && (
        <BackupManager
          projectName={projectMeta.projectName}
          linkedClis={linkedClis}
          onClose={() => setShowBackups(false)}
        />
      )}
    </div>
  )
}
