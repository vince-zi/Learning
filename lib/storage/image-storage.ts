// ============================================================
// Infrastructure: Image Storage Abstraction
// 支持 Supabase Storage 和本地文件系统两种模式
// ============================================================

import { v4 as uuidv4 } from 'uuid'

export interface StorageProvider {
  upload(file: File, path: string): Promise<string>          // 返回公开 URL
  delete(url: string): Promise<void>
  getPublicUrl(path: string): string
}

// --- Supabase Storage ---
import { createServerClient } from '../db/supabase-server'

class SupabaseStorage implements StorageProvider {
  private bucket = 'photos'

  async upload(file: File, path: string): Promise<string> {
    const supabase = createServerClient()
    const buffer = await file.arrayBuffer()

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) throw new Error(`Upload failed: ${error.message}`)

    return supabase.storage.from(this.bucket).getPublicUrl(data.path).data.publicUrl
  }

  async delete(url: string): Promise<void> {
    const supabase = createServerClient()
    // 从 URL 提取路径
    const path = url.split(`/${this.bucket}/`).pop()
    if (!path) return

    const { error } = await supabase.storage.from(this.bucket).remove([path])
    if (error) console.error('Delete error:', error.message)
  }

  getPublicUrl(path: string): string {
    const supabase = createServerClient()
    return supabase.storage.from(this.bucket).getPublicUrl(path).data.publicUrl
  }
}

// --- Local Storage (Development) ---
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

class LocalStorage implements StorageProvider {
  private baseDir = join(process.cwd(), 'storage', 'uploads')

  async upload(file: File, path: string): Promise<string> {
    // Ensure directory exists
    await mkdir(join(this.baseDir, path.split('/').slice(0, -1).join('/')), { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    const fullPath = join(this.baseDir, path)
    await writeFile(fullPath, buffer)

    // Return API route URL for serving the file
    return `/api/images/${path}`
  }

  async delete(url: string): Promise<void> {
    const { unlink } = await import('fs/promises')
    // Extract path from /api/images/... URL
    const relPath = url.replace('/api/images/', '')
    const filePath = join(this.baseDir, relPath)
    try {
      await unlink(filePath)
    } catch {
      // File may not exist, ignore
    }
  }

  getPublicUrl(path: string): string {
    return `/api/images/${path}`
  }
}

// --- Factory ---
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local'

  if (provider === 'supabase' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return new SupabaseStorage()
  }

  console.log('[Storage] Using local file storage')
  return new LocalStorage()
}

// --- Helper ---
export function generatePhotoPath(sessionId: string, order: number, extension: string): string {
  const id = uuidv4().slice(0, 8)
  return `sessions/${sessionId}/photo-${order}-${id}.${extension}`
}
