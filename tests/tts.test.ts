import { describe, it, expect } from 'vitest';
import { POST as ttsRoute } from '@/app/api/tts/route';
import { NextRequest } from 'next/server';

describe('Text-to-Speech API (hexgrad/Kokoro-82M)', () => {
  it('returns 400 when text is missing or empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: '' }),
    });

    const res = await ttsRoute(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Text must be provided');
  });

  it('generates speech audio for valid question text using Kokoro-82M with af_heart voice preset', async () => {
    const questionText = 'What happens first when a request hits this image upload endpoint?';
    const req = new NextRequest('http://localhost:3000/api/tts', {
      method: 'POST',
      body: JSON.stringify({
        text: questionText,
        model: 'hexgrad/Kokoro-82M',
        voice: 'af_heart',
      }),
    });

    const res = await ttsRoute(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('audio');
    expect(res.headers.get('x-tts-model')).toBe('hexgrad/Kokoro-82M');
    expect(res.headers.get('x-tts-voice')).toBe('af_heart');

    const audioBytes = await res.arrayBuffer();
    expect(audioBytes.byteLength).toBeGreaterThan(0);
  });
});
