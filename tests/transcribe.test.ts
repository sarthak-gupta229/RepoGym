import { describe, it, expect, vi } from 'vitest';
import { POST as transcribeRoute } from '@/app/api/transcribe/route';
import { NextRequest } from 'next/server';

describe('Speech-to-Text Transcription API (openai/whisper-small)', () => {
  it('returns 400 when no audio file is supplied', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeRoute(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No audio file provided');
  });

  it('accepts audio blob and returns transcribed text using whisper-small', async () => {
    const formData = new FormData();
    const dummyBlob = new Blob(['dummy audio bytes'], { type: 'audio/webm' });
    formData.append('file', dummyBlob, 'speech.webm');
    formData.append('model', 'openai/whisper-small');

    const req = new NextRequest('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBeDefined();
    expect(typeof data.text).toBe('string');
    expect(data.text.length).toBeGreaterThan(0);
    expect(data.source).toContain('whisper-small');
  });
});
