import { useRef, useEffect, useState } from 'react'
import { trpc } from '../trpc/client'
import { EDITOR_READONLY_THRESHOLD } from '@shared/constants'

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
      <div className={`flex items-center justify-center bg-gray-900 text-gray-500 ${className}`}>
        Select a file to preview
      </div>
    )
  }

  if (readFileQuery.isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-gray-500 ${className}`}>
        Loading...
      </div>
    )
  }

  const fileName = filePath.split(/[\\/]/).pop() || ''

  return (
    <div className={`flex flex-col bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-sm font-medium truncate flex-1">{fileName}</span>
        {hasChanges && (
          <span className="text-xs px-1.5 py-0.5 bg-orange-600/30 text-orange-400 rounded">
            Modified
          </span>
        )}
        {isReadOnly && (
          <span className="text-xs px-1.5 py-0.5 bg-yellow-600/30 text-yellow-400 rounded">
            Read-only ({Math.round(fileSize / 1024 / 1024)}MB)
          </span>
        )}
        {isMarkdown && !isEditing && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`text-xs px-2 py-1 rounded ${
              showPreview ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {showPreview ? 'Source' : 'Preview'}
          </button>
        )}
        {!isReadOnly && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            Edit
          </button>
        )}
        {isEditing && (
          <>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </button>
          </>
        )}
        <button
          onClick={handleDelete}
          className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 text-sm font-mono bg-gray-900 text-gray-300 resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : isMarkdown && showPreview ? (
          <div
            className="p-4 prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-gray-300">
            <code>{content}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
