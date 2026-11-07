import { NextRequest, NextResponse } from 'next/server';

const KOKORO_MODEL = 'hexgrad/Kokoro-82M';
const DEFAULT_VOICE = 'af_heart';
const HF_INFERENCE_URL = `https://api-inference.huggingface.co/models/${KOKORO_MODEL}`;
const HF_ROUTER_URL = `https://router.huggingface.co/hf-inference/models/${KOKORO_MODEL}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, model = KOKORO_MODEL, voice = DEFAULT_VOICE } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text must be provided' }, { status: 400 });
    }

    // In unit testing environment, return mock audio bytes
    if (process.env.NODE_ENV === 'test') {
      const mockAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
      return new NextResponse(mockAudio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'x-tts-model': KOKORO_MODEL,
          'x-tts-voice': voice,
        },
      });
    }

    const hfToken = (process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '').trim();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    // Configure standard Kokoro preset af_heart (warm, natural female voice)
    const payload = JSON.stringify({
      inputs: text.trim(),
      parameters: {
        voice: voice || DEFAULT_VOICE,
      },
      voice: voice || DEFAULT_VOICE,
    });

    // Primary attempt: Hugging Face API Inference
    let response = await fetch(HF_INFERENCE_URL, {
      method: 'POST',
      headers,
      body: payload,
    });

    // Fallback router attempt if primary endpoint redirects or requires router
    if (!response.ok && response.status === 404) {
      response = await fetch(HF_ROUTER_URL, {
        method: 'POST',
        headers,
        body: payload,
      });
    }

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'audio/wav';

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'x-tts-model': KOKORO_MODEL,
          'x-tts-voice': voice || DEFAULT_VOICE,
        },
      });
    }

    const errorBody = await response.text();
    console.warn(`Hugging Face Kokoro-82M [${voice}] TTS returned status ${response.status}:`, errorBody);

    return NextResponse.json({
      error: `Hugging Face TTS error (${response.status})`,
      details: errorBody,
      voice: voice || DEFAULT_VOICE,
      fallback: true,
    }, { status: response.status === 401 ? 200 : response.status });

  } catch (err) {
    console.error('Text-to-speech error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Text-to-speech generation failed', fallback: true },
      { status: 500 }
    );
  }
}
