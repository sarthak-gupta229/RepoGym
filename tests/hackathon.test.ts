import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HACKATHON_CRITERIA,
  PROJECT_EVALUATION_METRICS,
  generateHackathonQuestion,
  evaluateHackathonAnswer,
  evaluateHackathonAnswerStrictly,
} from '@/lib/hackathon';
import { store } from '@/lib/store';
import loginFixture from '@/tests/fixtures/login.json';
import { POST as createEvaluationRoute, GET as listEvaluationsRoute } from '@/app/api/hackathon/evaluations/route';
import { GET as getEvaluationRoute } from '@/app/api/hackathon/evaluations/[id]/route';
import { POST as submitAnswerRoute } from '@/app/api/hackathon/evaluations/[id]/answer/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llm')>();
  return {
    ...actual,
    askLLM: vi.fn().mockImplementation((prompt: string) => {
      if (prompt.includes('STUDENT / TEAM DEFENSE ANSWER:') || prompt.includes('STRICT EVALUATION MANDATE:')) {
        // Grading prompt
        return Promise.resolve({
          data: {
            score: 88,
            weightedScore: 22.0,
            verdict: 'exceptional',
            strengths: [
              'Clear identification of user authentication friction',
              'Deep understanding of target audience security needs',
            ],
            gaps: [
              'Could discuss multi-tenant organizational pain points',
            ],
            feedback: 'The team provided an exceptional defense demonstrating deep problem identification.',
            judgeTips: 'Lead with the end-user pain point at the demo table before explaining the solution workflow.',
            followUpThought: 'How does your solution scale to larger audiences?',
          },
          rawText: '{}',
          latencyMs: 15,
          model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
          promptLength: 250,
        });
      } else {
        // Question generation prompt
        return Promise.resolve({
          data: {
            criterionId: 'problem_understanding',
            criterionTitle: 'Problem Understanding & Identification',
            weight: 25,
            question: 'What specific root-cause problem does this project solve, who is the primary target audience, and why does this matter urgently to them?',
            rubricPoints: [
              'Identifies root cause vs symptoms',
              'Defines target audience and needs',
              'Articulates why the problem urgently matters',
            ],
            suggestedFileFocus: ['routes/login.js', 'models/user.js'],
          },
          rawText: '{}',
          latencyMs: 15,
          model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
          promptLength: 200,
        });
      }
    }),
  };
});

// Mock auth helper so test requests have a valid demo user
vi.mock('@/lib/auth-helper', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    id: 'demo-user-1',
    email: 'demo@repogym.dev',
    name: 'Demo Student',
  }),
}));

describe('Hackathon & Project Evaluation Metrics', () => {
  it('defines 6 hackathon criteria whose weights sum exactly to 100%', () => {
    expect(HACKATHON_CRITERIA).toHaveLength(6);
    const totalWeight = HACKATHON_CRITERIA.reduce((acc, c) => acc + c.weight, 0);
    expect(totalWeight).toBe(100);

    const ids = HACKATHON_CRITERIA.map((c) => c.id);
    expect(ids).toEqual([
      'problem_understanding',
      'solution_approach',
      'project_clarity',
      'creativity_innovation',
      'feasibility_impact',
      'technical_implementation',
    ]);
  });

  it('defines 5 project evaluation metrics whose weights sum exactly to 100%', () => {
    expect(PROJECT_EVALUATION_METRICS).toHaveLength(5);
    const totalWeight = PROJECT_EVALUATION_METRICS.reduce((acc, m) => acc + m.weight, 0);
    expect(totalWeight).toBe(100);
  });
});

describe('Hackathon Question Generation & Answer Evaluation', () => {
  it('generates a valid hackathon question for Criterion 1 (Problem Understanding & Identification)', async () => {
    const question = await generateHackathonQuestion(loginFixture, 'demo/login-service', 0);
    expect(question.criterionId).toBe('problem_understanding');
    expect(question.weight).toBe(25);
    expect(question.question).toBeDefined();
    expect(question.rubricPoints.length).toBeGreaterThan(0);
  });

  it('evaluates a team defense answer and computes weighted score', async () => {
    const question = {
      criterionId: 'problem_understanding',
      criterionTitle: 'Problem Understanding & Identification',
      weight: 25,
      question: 'What root-cause problem does your authentication service solve for end users?',
      rubricPoints: ['Identifies root cause vs symptoms', 'Defines target audience needs'],
      suggestedFileFocus: ['routes/login.js'],
    };

    const grade = await evaluateHackathonAnswer(
      question,
      'We identified that developers and end-users struggle with insecure credential handling. Instead of just patching symptoms, we address the root cause with encrypted verification.',
      loginFixture,
      'demo/login-service'
    );

    expect(grade.score).toBeGreaterThanOrEqual(0);
    expect(grade.score).toBeLessThanOrEqual(100);
    expect(grade.weightedScore).toBe(22.0);
    expect(grade.verdict).toBe('exceptional');
    expect(grade.strengths.length).toBeGreaterThan(0);
    expect(grade.judgeTips).toBeDefined();
  });

  it('assigns very low points to wrong or irrelevant answers', () => {
    const question = {
      criterionId: 'problem_understanding',
      criterionTitle: 'Problem Understanding & Identification',
      weight: 25,
      question: 'What root-cause problem does your project solve for end users?',
      rubricPoints: ['Root cause vs symptoms', 'Target audience', 'Why it matters urgently'],
      suggestedFileFocus: ['routes/login.js'],
    };

    // Case 1: Off-topic / nonsense answer
    const wrongGrade = evaluateHackathonAnswerStrictly(
      question,
      'I built a red toy car that drives on the road with blue wheels.',
      loginFixture,
      'demo/login-service'
    );
    expect(wrongGrade.score).toBeLessThanOrEqual(25);
    expect(wrongGrade.verdict).toBe('weak');
    expect(wrongGrade.gaps.length).toBeGreaterThan(0);

    // Case 2: Trivial answer
    const shortGrade = evaluateHackathonAnswerStrictly(
      question,
      'it works fine',
      loginFixture,
      'demo/login-service'
    );
    expect(shortGrade.score).toBeLessThanOrEqual(15);
    expect(shortGrade.verdict).toBe('weak');

    // Case 3: Admitting lack of knowledge
    const idkGrade = evaluateHackathonAnswerStrictly(
      question,
      "I don't know what the root cause problem is.",
      loginFixture,
      'demo/login-service'
    );
    expect(idkGrade.score).toBeLessThanOrEqual(20);
    expect(idkGrade.verdict).toBe('weak');
  });

  it('assigns high points to correct, comprehensive answers based on rubric points', () => {
    const question = {
      criterionId: 'problem_understanding',
      criterionTitle: 'Problem Understanding & Identification',
      weight: 25,
      question: 'What root-cause problem does your project solve for end users?',
      rubricPoints: ['Root cause vs symptoms', 'Target audience', 'Why it matters urgently'],
      suggestedFileFocus: ['routes/login.js'],
    };

    const correctGrade = evaluateHackathonAnswerStrictly(
      question,
      'The root cause problem is credential theft where developers struggle with insecure authentication. Our primary target audience is engineering teams who need secure access. This urgently matters because data breaches cause catastrophic financial loss rather than just surface friction.',
      loginFixture,
      'demo/login-service'
    );

    expect(correctGrade.score).toBeGreaterThanOrEqual(80);
    expect(correctGrade.verdict).toBe('exceptional');
    expect(correctGrade.strengths.length).toBeGreaterThanOrEqual(2);
  });
});

describe('PersistentStore Hackathon Evaluations', () => {
  beforeEach(() => {
    store.hackathonEvaluations.clear();
  });

  it('creates, retrieves, and updates hackathon evaluations in store', async () => {
    const evaluation = await store.createHackathonEvaluation({
      userId: 'demo-user-1',
      repoId: 'repo-demo',
      analysisId: 'demo',
    });

    expect(evaluation.id).toBeDefined();
    expect(evaluation.status).toBe('in_progress');
    expect(evaluation.current_criterion_index).toBe(0);
    expect(evaluation.total_criteria).toBe(6);

    const fetched = await store.getHackathonEvaluation(evaluation.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(evaluation.id);

    const updated = await store.updateHackathonEvaluation(evaluation.id, {
      total_score: 85.5,
      current_criterion_index: 3,
    });
    expect(updated.total_score).toBe(85.5);
    expect(updated.current_criterion_index).toBe(3);

    const userEvaluations = await store.getUserHackathonEvaluations('demo-user-1');
    expect(userEvaluations.length).toBe(1);
    expect(userEvaluations[0].id).toBe(evaluation.id);
  });
});

describe('Hackathon Evaluation API Endpoints', () => {
  beforeEach(() => {
    store.hackathonEvaluations.clear();
  });

  it('creates an evaluation and returns question 1 via POST /api/hackathon/evaluations', async () => {
    const req = new NextRequest('http://localhost:3000/api/hackathon/evaluations', {
      method: 'POST',
      body: JSON.stringify({
        analysisId: 'demo',
        repoId: 'repo-demo',
      }),
    });

    const res = await createEvaluationRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.evaluation).toBeDefined();
    expect(data.evaluation.status).toBe('in_progress');
    expect(data.currentQuestion).toBeDefined();
    expect(data.currentQuestion.criterionId).toBe('problem_understanding');
  });

  it('retrieves an existing evaluation via GET /api/hackathon/evaluations/[id]', async () => {
    const evaluation = await store.createHackathonEvaluation({
      userId: 'demo-user-1',
      repoId: 'repo-demo',
      analysisId: 'demo',
    });

    const req = new NextRequest(`http://localhost:3000/api/hackathon/evaluations/${evaluation.id}`);
    const res = await getEvaluationRoute(req, {
      params: Promise.resolve({ id: evaluation.id }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.evaluation.id).toBe(evaluation.id);
    expect(data.currentQuestion).toBeDefined();
    expect(data.criteria).toHaveLength(6);
  });

  it('submits defense answer and advances criterion via POST /api/hackathon/evaluations/[id]/answer', async () => {
    const evaluation = await store.createHackathonEvaluation({
      userId: 'demo-user-1',
      repoId: 'repo-demo',
      analysisId: 'demo',
    });

    const req = new NextRequest(`http://localhost:3000/api/hackathon/evaluations/${evaluation.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        answer: 'Our architecture cleanly separates Express routing from model lookups, using bcrypt for cryptographic validation.',
        question: {
          criterionId: 'problem_understanding',
          criterionTitle: 'Problem Understanding & Identification',
          weight: 25,
          question: 'What root problem does this solve?',
          rubricPoints: ['Root cause identification'],
          suggestedFileFocus: ['routes/login.js'],
        },
      }),
    });

    const res = await submitAnswerRoute(req, {
      params: Promise.resolve({ id: evaluation.id }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.evaluation.current_criterion_index).toBe(1);
    expect(data.evaluation.total_score).toBe(22.0);
    expect(data.result).toBeDefined();
    expect(data.result.verdict).toBe('exceptional');
    expect(data.nextQuestion).toBeDefined();
    expect(data.completed).toBe(false);
  });
});
