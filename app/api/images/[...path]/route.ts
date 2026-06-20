// Serve uploaded images from storage/uploads/
import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const filePath = join(process.cwd(), 'storage', 'uploads', ...path)

  try {
    const file = await readFile(filePath)
    const stats = await stat(filePath)

    // Determine MIME type from extension
    const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    }
    const mimeType = mimeTypes[ext] || 'image/jpeg'

    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stats.size),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }
}
