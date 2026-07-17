import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const apiKey = process.env.MOSI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'MOSI_API_KEY is not configured' }, { status: 500 });
    }

    // 重新组装请求体，发送到模思智能语音转写接口
    const sendFormData = new FormData();
    sendFormData.append('file', file);
    sendFormData.append('model', 'moss-transcribe');

    const response = await fetch('https://api.mosi.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: sendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ASR Proxy] Mosi API Error:', errorText);
      return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ASR Proxy] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
