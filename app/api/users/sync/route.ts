// ============================================================
// API Route: POST /api/users/sync
// 用户名 + 暗号 同步与注册接口
// ============================================================

import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/db/supabase-server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, passcode } = body

    if (!username || !passcode) {
      return NextResponse.json(
        { error: 'Username and passcode are required' },
        { status: 400 }
      )
    }

    const cleanUsername = username.trim()
    const cleanPasscode = passcode.trim()

    if (cleanUsername.length < 2 || cleanPasscode.length < 2) {
      return NextResponse.json(
        { error: 'Username and passcode must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()

    // 1. 检查是否存在同名用户 (大小写不敏感，统一转换为小写进行存储或查询)
    // 提示：PostgreSQL 默认区分大小写，使用 lower() 过滤或者直接进行 ILIKE 匹配
    const { data: existingUser, error: queryErr } = await supabase
      .from('users')
      .select('id, nickname, passcode')
      .ilike('nickname', cleanUsername)
      .maybeSingle()

    if (queryErr) {
      console.error('[User Sync Query Error]:', queryErr)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    // 2. 如果用户名已存在，进行密码验证
    if (existingUser) {
      const dbPasscode = existingUser.passcode || ''
      if (dbPasscode === cleanPasscode) {
        // 暗号匹配成功，返回用户 ID 进行设备同步
        return NextResponse.json({
          success: true,
          userId: existingUser.id,
          username: existingUser.nickname,
          status: 'synced',
        })
      } else {
        // 暗号匹配失败
        return NextResponse.json(
          { 
            error: 'passcode_incorrect',
            message: '该用户名已被注册且暗号不匹配。若这是你的账号，请重新输入暗号；若不是，请使用其他用户名。' 
          },
          { status: 403 }
        )
      }
    }

    // 3. 用户名不存在，创建全新用户
    const newUserId = `user_${uuidv4()}`
    const { error: insertErr } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        nickname: cleanUsername,
        passcode: cleanPasscode,
        is_anonymous: false,
        last_active_at: new Date().toISOString(),
      })

    if (insertErr) {
      console.error('[User Insertion Failed]:', insertErr)
      return NextResponse.json({ error: 'Failed to create new user profile' }, { status: 500 })
    }

    // 4. 创建英语学习者档案
    const { error: profileErr } = await supabase
      .from('english_learner_profiles')
      .insert({
        user_id: newUserId,
        cefr_level: 'A1',
        known_vocabulary_size: 500,
        strengths: ['具备基础英语交流和句型表达能力'],
        weaknesses: ['时态转换不够熟练，容易遗漏过去式'],
      })

    if (profileErr) {
      // 容错：即使档案建表失败，用户记录已生成，后续使用时会自动处理，此处仅记录 warn
      console.warn('[English Profile Initial Insertion Failed]:', profileErr)
    }

    return NextResponse.json({
      success: true,
      userId: newUserId,
      username: cleanUsername,
      status: 'registered',
    })
  } catch (err: any) {
    console.error('[User Sync Route Exception]:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
