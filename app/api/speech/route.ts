import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'en-US-JennyNeural' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.MOSI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'MOSI_API_KEY is not configured' }, { status: 500 });
    }

    // 调用模思智能语音合成接口
    const response = await fetch('https://api.mosi.cn/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moss-tts',
        input: text.trim(),
        voice: voice,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS Proxy] Mosi API Error:', errorText);
      return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[TTS Proxy] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
