import { useRef, useEffect, useState } from 'react'
import { trpc } from '../trpc/client'
import { EDITOR_READONLY_THRESHOLD } from '@shared/constants'

interface FilePreviewProps {
  filePath: string | null
  className?: string
}

export function FilePreview({ filePath, className = '' }: FilePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isMarkdown, setIsMarkdown] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [fileSize, setFileSize] = useState(0)

  const readFileQuery = trpc.fs.readFile.useQuery(
    { path: filePath || '' },
    {
      enabled: !!filePath,
      onSuccess: (data) => {
        if (data.success && 'content' in data) {
          setContent(data.content)
          setFileSize(data.size)
          setIsReadOnly(data.size > EDITOR_READONLY_THRESHOLD)
        }
      }
    }
  )

  useEffect(() => {
    if (filePath) {
      const ext = filePath.split('.').pop()?.toLowerCase() || ''
      setIsMarkdown(ext === 'md' || ext === 'markdown')
      setShowPreview(false)
    }
  }, [filePath])

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
    // Simple markdown rendering
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
        {isReadOnly && (
          <span className="text-xs px-1.5 py-0.5 bg-yellow-600/30 text-yellow-400 rounded">
            Read-only ({Math.round(fileSize / 1024 / 1024)}MB)
          </span>
        )}
        {isMarkdown && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`text-xs px-2 py-1 rounded ${
              showPreview ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isMarkdown && showPreview ? (
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
