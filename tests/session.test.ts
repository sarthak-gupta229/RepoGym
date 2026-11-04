import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llm')>();
  return {
    ...actual,
    askLLM: vi.fn().mockImplementation((prompt: string) => {
      if (prompt.includes('expectedFacts') || prompt.includes('challenge')) {
        return Promise.resolve({
          data: {
            question: 'What authentication step does /login perform first?',
            expectedFacts: [
              {
                id: 'fact_1',
                fact: 'findUserByEmail looks up user',
                file: 'routes/login.js',
                startLine: 8,
                endLine: 8,
              },
              {
                id: 'fact_2',
                fact: 'bcrypt.compare validates password',
                file: 'routes/login.js',
                startLine: 11,
                endLine: 11,
              },
            ],
          },
          rawText: '{}',
          latencyMs: 10,
          model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
          promptLength: 100,
        });
      } else {
        // Grading prompt
        return Promise.resolve({
          data: {
            score: 9,
            maxScore: 10,
            verdict: 'correct',
            covered: ['fact_1', 'fact_2'],
            missed: [],
            feedback: 'Accurately explains the user lookup and password comparison.',
            citations: [{ file: 'routes/login.js', startLine: 8, endLine: 11 }],
            followUpQuestion: null,
          },
          rawText: '{}',
          latencyMs: 10,
          model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
          promptLength: 100,
        });
      }
    }),
  };
});

import { store } from '@/lib/store';
import { POST as postSession } from '@/app/api/sessions/route';
import { POST as postAnswer } from '@/app/api/questions/[id]/answers/route';
import { POST as postNext } from '@/app/api/sessions/[id]/next/route';
import { NextRequest } from 'next/server';

describe('Phase 4: Full 3-question session on login fixture', () => {
  it('runs a complete 3-question session to completion with grading and citations', async () => {
    // 1. Start a new session on 'demo' analysis
    const startReq = new NextRequest('http://localhost:3000/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ analysisId: 'demo' }),
    });

    const startRes = await postSession(startReq);
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();

    const sessionId = startData.session.id;
    let currentQuestion = startData.question;

    expect(sessionId).toBeDefined();
    expect(startData.session.status).toBe('in_progress');
    expect(currentQuestion.position).toBe(1);

    // Question 1: Submit answer
    const answer1Req = new NextRequest(
      `http://localhost:3000/api/questions/${currentQuestion.id}/answers`,
      {
        method: 'POST',
        body: JSON.stringify({
          answer:
            'When the POST /login route is hit, it looks up the user with findUserByEmail, then compares the password using bcrypt.compare.',
        }),
      }
    );

    const ans1Res = await postAnswer(answer1Req, {
      params: Promise.resolve({ id: currentQuestion.id }),
    });
    expect(ans1Res.status).toBe(200);
    const ans1Data = await ans1Res.json();
    expect(ans1Data.attempt.score).toBeGreaterThan(0);
    expect(ans1Data.sessionCompleted).toBe(false);

    // Question 2: Advance
    const next1Req = new NextRequest(
      `http://localhost:3000/api/sessions/${sessionId}/next`,
      { method: 'POST' }
    );
    const next1Res = await postNext(next1Req, {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(next1Res.status).toBe(200);
    const next1Data = await next1Res.json();
    currentQuestion = next1Data.question;
    expect(currentQuestion.position).toBe(2);

    // Question 2: Submit answer
    const answer2Req = new NextRequest(
      `http://localhost:3000/api/questions/${currentQuestion.id}/answers`,
      {
        method: 'POST',
        body: JSON.stringify({
          answer: 'The system validates user credentials and returns 401 if invalid.',
        }),
      }
    );
    const ans2Res = await postAnswer(answer2Req, {
      params: Promise.resolve({ id: currentQuestion.id }),
    });
    expect(ans2Res.status).toBe(200);
    const ans2Data = await ans2Res.json();
    expect(ans2Data.sessionCompleted).toBe(false);

    // Question 3: Advance
    const next2Req = new NextRequest(
      `http://localhost:3000/api/sessions/${sessionId}/next`,
      { method: 'POST' }
    );
    const next2Res = await postNext(next2Req, {
      params: Promise.resolve({ id: sessionId }),
    });
    expect(next2Res.status).toBe(200);
    const next2Data = await next2Res.json();
    currentQuestion = next2Data.question;
    expect(currentQuestion.position).toBe(3);

    // Question 3: Submit final answer
    const answer3Req = new NextRequest(
      `http://localhost:3000/api/questions/${currentQuestion.id}/answers`,
      {
        method: 'POST',
        body: JSON.stringify({
          answer: 'Logged in successfully with HTTP 200 response json.',
        }),
      }
    );
    const ans3Res = await postAnswer(answer3Req, {
      params: Promise.resolve({ id: currentQuestion.id }),
    });
    expect(ans3Res.status).toBe(200);
    const ans3Data = await ans3Res.json();

    // Verify session completion
    expect(ans3Data.sessionCompleted).toBe(true);

    const finalSession = await store.getSession(sessionId);
    expect(finalSession?.status).toBe('completed');
  });

  it('rejects answers over 2,000 characters with 400', async () => {
    const startReq = new NextRequest('http://localhost:3000/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ analysisId: 'demo' }),
    });
    const startRes = await postSession(startReq);
    const { question } = await startRes.json();

    const longAnswer = 'a'.repeat(2001);
    const ansReq = new NextRequest(
      `http://localhost:3000/api/questions/${question.id}/answers`,
      {
        method: 'POST',
        body: JSON.stringify({ answer: longAnswer }),
      }
    );

    const ansRes = await postAnswer(ansReq, {
      params: Promise.resolve({ id: question.id }),
    });
    expect(ansRes.status).toBe(400);
    const ansData = await ansRes.json();
    expect(ansData.error).toContain('2,000 character limit');
  });
});
