'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Link, X, Image as ImageIcon, Loader2, ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCloudinaryUpload } from '@/lib/cloudinary'

// Popular free image sites
const IMAGE_SOURCES = [
  {
    name: 'Unsplash',
    url: 'https://unsplash.com',
    description: 'High-quality free photos',
    icon: '📷',
  },
  {
    name: 'Pexels',
    url: 'https://pexels.com',
    description: 'Free stock photos & videos',
    icon: '🎬',
  },
  {
    name: 'Pixabay',
    url: 'https://pixabay.com',
    description: 'Free images & videos',
    icon: '🖼️',
  },
  {
    name: 'Freepik',
    url: 'https://freepik.com',
    description: 'Vectors & photos',
    icon: '✨',
  },
]

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  folder?: string
  className?: string
  placeholder?: string
  aspectRatio?: string // e.g., "16/9" or "1/1"
}

export function ImageUploader({
  value,
  onChange,
  folder = 'dukaafrica/categories',
  className,
  placeholder = 'Upload or paste an image URL',
  aspectRatio = '16/9',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload } = useCloudinaryUpload()

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image must be less than 5MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const url = await upload(file, { folder })
      if (url) {
        onChange(url)
      } else {
        setError('Upload failed. Please try again.')
      }
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [folder, onChange, upload])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    // Reset input
    e.target.value = ''
  }, [handleFileUpload])

  // Handle URL paste
  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      // Basic URL validation
      try {
        new URL(urlInput)
        onChange(urlInput.trim())
        setUrlInput('')
        setShowUrlInput(false)
        setError(null)
      } catch {
        setError('Please enter a valid URL')
      }
    }
  }, [urlInput, onChange])

  // Clear image
  const handleClear = useCallback(() => {
    onChange('')
    setError(null)
  }, [onChange])

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          handleFileUpload(file)
        }
        return
      }
    }

    // Check for URL in clipboard
    const text = e.clipboardData.getData('text')
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
      setUrlInput(text)
      setShowUrlInput(true)
    }
  }, [handleFileUpload])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Preview Area */}
      {value ? (
        <div className="relative group">
          <div 
            className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
            style={{ aspectRatio }}
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => {
                setError('Failed to load image. Check the URL.')
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleClear}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 truncate mt-1">{value}</p>
        </div>
      ) : (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl transition-all cursor-pointer',
            isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800/50',
            error && 'border-red-300 bg-red-50 dark:bg-red-950/20'
          )}
          style={{ aspectRatio }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Drag & drop an image here
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  or click to browse • PNG, JPG, WebP (max 5MB)
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  💡 You can also paste an image or URL from clipboard
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* URL Input Toggle */}
      {!value && (
        <div className="space-y-2">
          {showUrlInput ? (
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                className="flex-1"
              />
              <Button onClick={handleUrlSubmit} size="icon">
                <Link className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => { setShowUrlInput(false); setUrlInput(''); }} 
                variant="outline" 
                size="icon"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                setShowUrlInput(true)
              }}
            >
              <Link className="w-4 h-4 mr-2" />
              Paste Image URL Instead
            </Button>
          )}
        </div>
      )}

      {/* Free Image Sources */}
      {!value && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Search className="w-3 h-3" />
            Need images? Try these free resources:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {IMAGE_SOURCES.map((source) => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                <span>{source.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    {source.name}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                  <div className="text-xs text-gray-500 truncate">{source.description}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
