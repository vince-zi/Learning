// ============================================================
// API Route: POST /api/upload
// 上传照片 → 存储 → 数据库记录
// ============================================================

import { NextResponse } from 'next/server'
import { getStorageProvider, generatePhotoPath } from '@/lib/storage/image-storage'
import { getServerClient } from '@/lib/db/supabase-server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string | null
    const userId = formData.get('userId') as string | null
    const uploadOrder = parseInt(formData.get('uploadOrder') as string || '1')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'sessionId and userId are required' }, { status: 400 })
    }

    // 生成文件名和路径
    const extension = file.name.split('.').pop() || 'jpg'
    const path = generatePhotoPath(sessionId, uploadOrder, extension)

    // 上传到存储
    const storage = getStorageProvider()
    const imageUrl = await storage.upload(file, path)

    // 写入数据库
    const supabase = getServerClient()
    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        session_id: sessionId,
        user_id: userId,
        image_url: imageUrl,
        upload_order: uploadOrder,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Failed to save photo record:', dbError.message)
      // 图片已上传，DB 写入失败 —— 记录但不阻断
    }

    // 更新会话照片计数
    const { data: currentSession } = await supabase
      .from('learning_sessions')
      .select('photo_count')
      .eq('id', sessionId)
      .single()

    if (currentSession) {
      await supabase
        .from('learning_sessions')
        .update({ photo_count: (currentSession.photo_count || 0) + 1 })
        .eq('id', sessionId)
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: photo?.id,
        imageUrl,
        uploadOrder,
      },
    })
  } catch (error: any) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
