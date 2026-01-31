import { useRef, useEffect, useState } from 'react'
import { trpc } from '../trpc/client'
import { EDITOR_READONLY_THRESHOLD } from '@shared/constants'
import { Edit3, Save, X, Trash2, Eye, Code } from 'lucide-react'
import { clsx } from 'clsx'

interface FilePreviewProps {
  filePath: string | null
  className?: string
  onDelete?: (path: string) => void
  onSave?: () => void
}

export function FilePreview({ filePath, className = '', onDelete, onSave }: FilePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isMarkdown, setIsMarkdown] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [fileSize, setFileSize] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const utils = trpc.useUtils()

  const readFileQuery = trpc.fs.readFile.useQuery(
    { path: filePath || '' },
    {
      enabled: !!filePath,
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
    if (filePath) {
      const ext = filePath.split('.').pop()?.toLowerCase() || ''
      setIsMarkdown(ext === 'md' || ext === 'markdown')
      setShowPreview(false)
      setIsEditing(false)
    }
  }, [filePath])

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
    const confirmed = confirm(`Delete "${filePath.split(/[\\/]/).pop()}"?`)
    if (!confirmed) return

    try {
      await deleteMutation.mutateAsync({ path: filePath })
      onDelete?.(filePath)
    } catch (e) {
      alert('Failed to delete file')
    }
  }

  const handleCancel = () => {
    setContent(originalContent)
    setIsEditing(false)
  }

  const hasChanges = content !== originalContent

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      py: 'python',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sh: 'shell',
      bash: 'shell'
    }
    return langMap[ext] || 'plaintext'
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

  if (!filePath) {
    return (
      <div className={clsx('flex items-center justify-center bg-app-bg text-app-text-muted', className)}>
        Select a file to preview
      </div>
    )
  }

  if (readFileQuery.isLoading) {
    return (
      <div className={clsx('flex items-center justify-center bg-app-bg text-app-text-muted', className)}>
        Loading...
      </div>
    )
  }

  const fileName = filePath.split(/[\\/]/).pop() || ''

  return (
    <div className={clsx('flex flex-col bg-app-bg', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-app-surface border-b border-app-border">
        <span className="text-sm font-medium truncate flex-1 text-app-text">{fileName}</span>
        {hasChanges && (
          <span className="text-xs px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded">
            Modified
          </span>
        )}
        {isReadOnly && (
          <span className="text-xs px-1.5 py-0.5 bg-app-surface-hover text-app-text-muted rounded">
            Read-only ({Math.round(fileSize / 1024 / 1024)}MB)
          </span>
        )}
        {isMarkdown && !isEditing && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              showPreview ? 'bg-primary text-white' : 'text-app-text-muted hover:bg-app-surface-hover hover:text-app-text'
            )}
            title={showPreview ? 'Show source' : 'Show preview'}
          >
            {showPreview ? <Code size={14} /> : <Eye size={14} />}
          </button>
        )}
        {!isReadOnly && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-md text-app-text-muted hover:bg-app-surface-hover hover:text-app-text transition-colors"
            title="Edit"
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
              title="Save"
            >
              <Save size={14} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-md text-app-text-muted hover:bg-app-surface-hover hover:text-app-text transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-md text-danger hover:bg-danger-surface transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 text-sm font-mono bg-app-bg text-app-text resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : isMarkdown && showPreview ? (
          <div
            className="p-4 prose prose-invert max-w-none text-app-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-app-text-muted">
            <code>{content}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
