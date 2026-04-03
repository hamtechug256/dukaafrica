'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface FileUploadData {
  url: string
  publicId: string
  bytes: number
  fileName: string
  type: string
}

interface FileUploaderProps {
  value?: FileUploadData | null
  onUploadComplete: (data: FileUploadData) => void
  onRemove?: () => void
  accept?: string[]
  maxSizeMB?: number
  folder?: string
  className?: string
  disabled?: boolean
}

// Map MIME types to display types
function getFileType(mimeType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'PDF'
  if (ext === 'doc' || mimeType === 'application/msword') return 'DOC'
  if (
    ext === 'docx' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'DOCX'
  if (
    ext === 'xlsx' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'XLSX'
  if (mimeType.startsWith('image/')) return 'IMAGE'
  return ext.toUpperCase()
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const DEFAULT_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const DEFAULT_ACCEPT_EXTENSIONS = '.pdf,.doc,.docx,.xlsx'

export function FileUploader({
  value,
  onUploadComplete,
  onRemove,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 25,
  folder = 'dukaafrica/documents',
  className,
  disabled = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxBytes = maxSizeMB * 1024 * 1024

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxBytes) {
        return `File must be less than ${maxSizeMB}MB`
      }
      // Check file type
      if (accept.length > 0 && !accept.includes(file.type)) {
        // Fallback: check extension
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        const acceptedExts = DEFAULT_ACCEPT_EXTENSIONS.split(',')
        if (!acceptedExts.includes(ext)) {
          return 'Unsupported file type. Accepted: PDF, DOC, DOCX, XLSX'
        }
      }
      return null
    },
    [accept, maxBytes, maxSizeMB]
  )

  const handleFileUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setSelectedFile(file)
      setIsUploading(true)
      setError(null)
      setUploadProgress(10)

      try {
        // Determine if it's an image or document for Cloudinary
        const isImage = file.type.startsWith('image/')
        const isPdf = file.type === 'application/pdf'

        // If not image and not PDF, we need to upload as raw
        // The current upload API only supports images and PDFs
        // For other types (DOC, DOCX, XLSX), we also use the raw endpoint
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        // Simulate progress for UX
        setUploadProgress(30)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        setUploadProgress(80)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Upload failed')
        }

        const result = await response.json()
        setUploadProgress(100)

        const fileType = getFileType(file.type, file.name)
        const uploadData: FileUploadData = {
          url: result.url,
          publicId: result.publicId,
          bytes: result.bytes || file.size,
          fileName: result.fileName || file.name,
          type: fileType,
        }

        onUploadComplete(uploadData)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Upload failed. Please try again.'
        setError(message)
        setSelectedFile(null)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [folder, onUploadComplete, validateFile]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload, disabled]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileUpload(file)
      e.target.value = ''
    },
    [handleFileUpload]
  )

  const handleRemove = useCallback(() => {
    setSelectedFile(null)
    setError(null)
    setUploadProgress(0)
    onRemove?.()
  }, [onRemove])

  // Success state: file is uploaded
  if (value) {
    return (
      <Card
        className={cn('border border-green-200 bg-green-50/50 dark:bg-green-950/20', className)}
      >
        <div className="flex items-center gap-3 p-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {value.type} &middot; {formatFileSize(value.bytes)}
            </p>
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    )
  }

  // Uploading state
  if (isUploading && selectedFile) {
    return (
      <Card className={cn('border', className)}>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                Uploading &middot; {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            {uploadProgress}%
          </p>
        </div>
      </Card>
    )
  }

  // Drop zone
  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl transition-all cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800/50',
          error && 'border-red-300 bg-red-50/50 dark:bg-red-950/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">
            Drag & drop your file here
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse &middot; PDF, DOC, DOCX, XLSX (max {maxSizeMB}MB)
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={DEFAULT_ACCEPT_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
