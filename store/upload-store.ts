// ============================================================
// Store: Upload State Management (Zustand)
// 管理图片上传流程的客户端状态
// ============================================================

import { create } from 'zustand'

export interface UploadStore {
  // 预览
  previewUrl: string | null
  setPreviewUrl: (url: string | null) => void

  // 上传状态
  status: 'idle' | 'selecting' | 'compressing' | 'uploading' | 'success' | 'error'
  setStatus: (status: UploadStore['status']) => void

  // 进度
  progress: number          // 0-100
  setProgress: (progress: number) => void

  // 错误
  error: string | null
  setError: (error: string | null) => void

  // 结果
  uploadedUrl: string | null
  setUploadedUrl: (url: string | null) => void

  // 重置
  reset: () => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  previewUrl: null,
  setPreviewUrl: (url) => set({ previewUrl: url }),

  status: 'idle',
  setStatus: (status) => set({ status }),

  progress: 0,
  setProgress: (progress) => set({ progress }),

  error: null,
  setError: (error) => set({ error }),

  uploadedUrl: null,
  setUploadedUrl: (url) => set({ uploadedUrl: url }),

  reset: () =>
    set({
      previewUrl: null,
      status: 'idle',
      progress: 0,
      error: null,
      uploadedUrl: null,
    }),
}))
