import { describe, it, expect, vi } from 'vitest';
import { detectFlows, selectFlowFiles } from '@/lib/select';
import { numberLines, buildPrompt, buildChallengePrompt } from '@/lib/prompt';
import { extractJSON, askLLM } from '@/lib/llm';
import { validateChallenge, validateGrade } from '@/lib/validate';
import { Challenge, Grade } from '@/lib/schemas';
import { generateChallenge, ChallengeGenerationError } from '@/lib/generate';
import loginFixture from './fixtures/login.json';

describe('select.ts - flow detection and file picking', () => {
  it('detects the POST /login flow from fixture', () => {
    const flows = detectFlows(loginFixture);
    expect(flows.length).toBeGreaterThan(0);
    const loginFlow = flows.find((f) => f.label.includes('/login'));
    expect(loginFlow).toBeDefined();
    expect(loginFlow?.routeFile).toBe('routes/login.js');
  });

  it('selects flow files matching Section 6 specification', () => {
    const flows = detectFlows(loginFixture);
    const loginFlow = flows.find((f) => f.label.includes('/login'))!;
    const flowFiles = selectFlowFiles(loginFixture, loginFlow);

    expect(Object.keys(flowFiles)).toContain('routes/login.js');
    expect(Object.keys(flowFiles)).toContain('models/user.js');
    expect(Object.keys(flowFiles)).not.toContain('app.js');
    expect(Object.keys(flowFiles)).not.toContain('utils/logger.js');
  });
});

describe('prompt.ts - line numbering and prompt building', () => {
  it('numbers lines with 1-based N: prefix', () => {
    const code = 'const a = 1;\nconst b = 2;';
    expect(numberLines(code)).toBe('1: const a = 1;\n2: const b = 2;');
  });

  it('buildPrompt wraps code in file tags', () => {
    const prompt = buildPrompt({ 'test.js': 'console.log(1);' }, 'Analyze this code:');
    expect(prompt).toContain('<file path="test.js">');
    expect(prompt).toContain('1: console.log(1);');
    expect(prompt).toContain('</file>');
  });

  it('matches snapshot for login challenge prompt', () => {
    const flowFiles = {
      'routes/login.js': loginFixture['routes/login.js'],
      'models/user.js': loginFixture['models/user.js'],
    };
    const prompt = buildChallengePrompt(flowFiles, 'POST /login', 'routes/login.js');
    expect(prompt).toMatchSnapshot();
  });
});

describe('llm.ts - extractJSON and askLLM', () => {
  it('extracts JSON surrounded by markdown and text', () => {
    const raw = 'Sure! Here is the JSON:\n```json\n{"score": 9, "verdict": "correct"}\n```\nHope it helps!';
    const parsed = extractJSON<{ score: number; verdict: string }>(raw);
    expect(parsed).toEqual({ score: 9, verdict: "correct" });
  });

  it('throws on invalid text with no braces', () => {
    expect(() => extractJSON('No json here')).toThrow();
  });

  it('retries once on invalid JSON and succeeds', async () => {
    let callCount = 0;
    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                choices: [{ message: { content: 'Invalid JSON response without braces' } }],
              });
            }
            return Promise.resolve({
              choices: [{ message: { content: '{"status": "ok"}' } }],
            });
          }),
        },
      },
    };

    const result = await askLLM<{ status: string }>('test prompt', {
      openaiClient: mockOpenAI as any,
      retries: 1,
    });

    expect(callCount).toBe(2);
    expect(result.data).toEqual({ status: 'ok' });
  });
});

describe('validate.ts - citation and range validation', () => {
  it('rejects a fake file in expected facts', () => {
    const invalidChallenge: Challenge = {
      question: 'What does login do?',
      expectedFacts: [
        {
          id: 'fact_1',
          fact: 'Checks password',
          file: 'nonexistent/file.js',
          startLine: 1,
          endLine: 5,
        },
      ],
    };

    const problems = validateChallenge(invalidChallenge, loginFixture);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toContain('does not exist in the file map');
  });

  it('rejects an out-of-bounds line number', () => {
    const invalidChallenge: Challenge = {
      question: 'What does login do?',
      expectedFacts: [
        {
          id: 'fact_1',
          fact: 'Checks password',
          file: 'routes/login.js',
          startLine: 1,
          endLine: 9999,
        },
      ],
    };

    const problems = validateChallenge(invalidChallenge, loginFixture);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toContain('out of bounds');
  });

  it('validates a correct challenge with zero problems', () => {
    const validChallenge: Challenge = {
      question: 'How is the user authenticated in /login?',
      expectedFacts: [
        {
          id: 'fact_1',
          fact: 'The route calls findUserByEmail with the body email',
          file: 'routes/login.js',
          startLine: 8,
          endLine: 8,
        },
        {
          id: 'fact_2',
          fact: 'findUserByEmail searches an array of users',
          file: 'models/user.js',
          startLine: 5,
          endLine: 7,
        },
        {
          id: 'fact_3',
          fact: 'bcrypt.compare checks the provided password against user.passwordHash',
          file: 'routes/login.js',
          startLine: 11,
          endLine: 11,
        },
      ],
    };

    const problems = validateChallenge(validChallenge, loginFixture);
    expect(problems).toEqual([]);
  });

  it('rejects grade with unlisted fact IDs', () => {
    const validFacts = [
      { id: 'fact_1', fact: 'Fact 1', file: 'routes/login.js', startLine: 1, endLine: 2 },
    ];

    const badGrade: Grade = {
      score: 8,
      maxScore: 10,
      verdict: 'correct',
      covered: ['unknown_fact_id'],
      missed: [],
      feedback: 'Good job',
      citations: [{ file: 'routes/login.js', startLine: 1, endLine: 2 }],
      followUpQuestion: null,
    };

    const problems = validateGrade(badGrade, validFacts, loginFixture);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toContain('does not exist in expected facts');
  });
});

describe('generate.ts - orchestration and retry on validation failure', () => {
  it('retries once if validation fails and succeeds on second try', async () => {
    const flows = detectFlows(loginFixture);
    const loginFlow = flows.find((f) => f.label.includes('/login'))!;

    let callCount = 0;
    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        question: 'How is login handled?',
                        expectedFacts: [
                          {
                            id: 'fact_1',
                            fact: 'Bad line range',
                            file: 'routes/login.js',
                            startLine: 1,
                            endLine: 9999,
                          },
                        ],
                      }),
                    },
                  },
                ],
              });
            }
            return Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      question: 'How is login handled?',
                      expectedFacts: [
                        {
                          id: 'fact_1',
                          fact: 'Valid citation',
                          file: 'routes/login.js',
                          startLine: 8,
                          endLine: 8,
                        },
                      ],
                    }),
                  },
                },
              ],
            });
          }),
        },
      },
    };

    const challenge = await generateChallenge(loginFixture, loginFlow, undefined, {
      openaiClient: mockOpenAI as any,
    });

    expect(callCount).toBe(2);
    expect(challenge.expectedFacts[0].endLine).toBe(8);
  });

  it('throws ChallengeGenerationError when validation repeatedly fails', async () => {
    const flows = detectFlows(loginFixture);
    const loginFlow = flows.find((f) => f.label.includes('/login'))!;

    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    question: 'Question?',
                    expectedFacts: [
                      {
                        id: 'fact_1',
                        fact: 'Invalid file',
                        file: 'fake.js',
                        startLine: 1,
                        endLine: 2,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        },
      },
    };

    await expect(
      generateChallenge(loginFixture, loginFlow, undefined, { openaiClient: mockOpenAI as any })
    ).rejects.toThrow(ChallengeGenerationError);
  });
});
