'use client'

import { useState, useRef, type ChangeEvent } from 'react'

interface ImageUploaderProps {
  onUpload: (file: File) => void
  isLoading?: boolean
  label?: string
  accept?: string
}

export function ImageUploader({
  onUpload,
  isLoading,
  label = '选择照片',
  accept = 'image/*',
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 前端预览
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    onUpload(file)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {preview ? (
        <div className="relative w-full max-w-sm">
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-2xl object-cover aspect-[4/3] shadow-lg"
          />
          {!isLoading && (
            <button
              onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = '' }}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors text-sm"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-zinc-300 rounded-2xl hover:border-zinc-400 hover:bg-zinc-50 transition-all disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50 cursor-pointer"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
            <p className="text-xs text-zinc-400 mt-1">支持 JPG、PNG、HEIC</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {isLoading && (
        <p className="text-sm text-zinc-500 flex items-center gap-2">
          <span className="animate-spin">⏳</span> 正在上传...
        </p>
      )}
    </div>
  )
}
