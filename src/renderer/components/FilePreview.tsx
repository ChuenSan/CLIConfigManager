import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trpc } from '../trpc/client'
import { EDITOR_READONLY_THRESHOLD } from '@shared/constants'
import { Edit3, Save, X, Trash2, Eye, Code } from 'lucide-react'
import { clsx } from 'clsx'
import * as Dialog from '@radix-ui/react-dialog'
import { ConfirmDialog } from './ConfirmDialog'

interface FilePreviewModalProps {
  filePath: string | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (path: string) => void
  onSave?: () => void
}

export function FilePreviewModal({ filePath, isOpen, onClose, onDelete, onSave }: FilePreviewModalProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [isMarkdown, setIsMarkdown] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [fileSize, setFileSize] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const readFileQuery = trpc.fs.readFile.useQuery(
    { path: filePath || '' },
    {
      enabled: !!filePath && isOpen,
      onSuccess: (data) => {
        if (data.success && 'content' in data) {
          setContent(data.content)
          setOriginalContent(data.content)
          setFileSize(data.size)
          setIsReadOnly(data.size > EDITOR_READONLY_THRESHOLD)
          setIsEditing(false)
        }
      }
    }
  )

  const writeMutation = trpc.fs.writeFile.useMutation()
  const deleteMutation = trpc.fs.deleteFile.useMutation()

  useEffect(() => {
    if (filePath && isOpen) {
      const ext = filePath.split('.').pop()?.toLowerCase() || ''
      setIsMarkdown(ext === 'md' || ext === 'markdown')
      setShowPreview(false)
      setIsEditing(false)
    }
  }, [filePath, isOpen])

  const hasChanges = content !== originalContent

  const handleSave = async () => {
    if (!filePath || isReadOnly) return
    setSaving(true)
    try {
      await writeMutation.mutateAsync({ path: filePath, content })
      setOriginalContent(content)
      setIsEditing(false)
      onSave?.()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!filePath) return
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!filePath) return
    try {
      await deleteMutation.mutateAsync({ path: filePath })
      onDelete?.(filePath)
    } catch (e) {
      alert(t('filePreview.deleteFailed'))
    }
    setShowDeleteConfirm(false)
  }

  const handleCancel = () => {
    setContent(originalContent)
    setIsEditing(false)
  }

  const handleClose = () => {
    if (isEditing && hasChanges) {
      setShowDiscardConfirm(true)
      return
    }
    setIsEditing(false)
    onClose()
  }

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false)
    setIsEditing(false)
    onClose()
  }

  const renderMarkdown = (text: string): string => {
    return text
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/\n/g, '<br/>')
  }

  const fileName = filePath ? filePath.split(/[\\/]/).pop() || '' : ''

  return (
    <>
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-bg rounded-xl border border-app-border shadow-2xl z-50 w-[90vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-slide-in focus:outline-none">

          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-app-surface border-b border-app-border select-none">
            <Dialog.Title className="text-base font-semibold truncate flex-1 text-app-text">
              {fileName || t('filePreview.loading')}
            </Dialog.Title>

            {hasChanges && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded">
                {t('filePreview.modified')}
              </span>
            )}
            {isReadOnly && (
              <span className="text-xs px-1.5 py-0.5 bg-app-surface-hover text-app-text-muted rounded">
                {t('filePreview.readOnly', { size: Math.round(fileSize / 1024 / 1024) })}
              </span>
            )}

            {isMarkdown && !isEditing && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  showPreview ? 'bg-primary text-white' : 'text-app-text-muted hover:bg-app-surface-hover hover:text-app-text'
                )}
                title={showPreview ? t('filePreview.showSource') : t('filePreview.showPreview')}
              >
                {showPreview ? <Code size={14} /> : <Eye size={14} />}
              </button>
            )}

            {!isReadOnly && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md text-app-text-muted hover:bg-app-surface-hover hover:text-app-text transition-colors"
                title={t('filePreview.edit')}
              >
                <Edit3 size={14} />
              </button>
            )}

            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="p-1.5 rounded-md bg-success text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  title={t('filePreview.save')}
                >
                  <Save size={14} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-md text-app-text-muted hover:bg-app-surface-hover hover:text-app-text transition-colors"
                  title={t('filePreview.cancel')}
                >
                  <X size={14} />
                </button>
              </>
            )}

            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md text-danger hover:bg-danger-surface transition-colors"
              title={t('filePreview.delete')}
            >
              <Trash2 size={14} />
            </button>

            <div className="w-px h-4 bg-app-border mx-1" />

            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-app-text-muted hover:bg-app-surface-hover hover:text-app-text transition-colors"
              title={t('filePreview.close')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {readFileQuery.isLoading ? (
              <div className="flex items-center justify-center h-full text-app-text-muted">
                {t('filePreview.loading')}
              </div>
            ) : !filePath ? (
              <div className="flex items-center justify-center h-full text-app-text-muted">
                {t('filePreview.noFileSelected')}
              </div>
            ) : isEditing ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full p-6 text-sm font-mono bg-app-bg text-app-text resize-none focus:outline-none"
                spellCheck={false}
                autoFocus
              />
            ) : isMarkdown && showPreview ? (
              <div
                className="p-6 prose prose-invert max-w-none text-app-text"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            ) : (
              <pre className="p-6 text-sm font-mono whitespace-pre-wrap text-app-text-muted leading-relaxed">
                <code>{content}</code>
              </pre>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <ConfirmDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      title={t('dialog.confirm')}
      description={t('filePreview.deleteConfirm', { filename: fileName })}
      variant="danger"
      confirmLabel={t('dialog.delete')}
      onConfirm={handleDeleteConfirm}
    />

    <ConfirmDialog
      open={showDiscardConfirm}
      onOpenChange={setShowDiscardConfirm}
      title={t('dialog.confirm')}
      description={t('filePreview.discardChanges')}
      onConfirm={handleDiscardConfirm}
    />
    </>
  )
}
