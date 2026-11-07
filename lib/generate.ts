import OpenAI from 'openai';
import { Flow, selectFlowFiles } from './select';
import { buildChallengePrompt, buildGradingPrompt, PastResult } from './prompt';
import { askLLM } from './llm';
import {
  type Challenge,
  ChallengeSchema,
  type Grade,
  GradeSchema,
  type ExpectedFact,
} from './schemas';

export type { Challenge, Grade, ExpectedFact };
import { validateChallenge, validateGrade } from './validate';

export class ChallengeGenerationError extends Error {
  problems: string[];
  constructor(message: string, problems: string[] = []) {
    super(message);
    this.name = 'ChallengeGenerationError';
    this.problems = problems;
  }
}

export class GradingError extends Error {
  problems: string[];
  constructor(message: string, problems: string[] = []) {
    super(message);
    this.name = 'GradingError';
    this.problems = problems;
  }
}

export async function generateChallenge(
  files: Record<string, string>,
  flow: Flow,
  pastResults?: PastResult[],
  options?: { openaiClient?: OpenAI; difficulty?: 'easy' | 'medium' | 'hard' }
): Promise<Challenge> {
  const difficulty = options?.difficulty || 'easy';
  const flowFiles = selectFlowFiles(files, flow);
  let prompt = buildChallengePrompt(flowFiles, flow.label, flow.routeFile, pastResults, { difficulty });

  let lastProblems: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await askLLM(prompt, { openaiClient: options?.openaiClient });
      const parsed = ChallengeSchema.parse(response.data);
      const problems = validateChallenge(parsed, files);

      if (problems.length === 0) {
        return parsed;
      }

      lastProblems = problems;
      console.warn(`Challenge validation failed on attempt ${attempt + 1}:`, problems);

      prompt = `${prompt}\n\nIMPORTANT: Your previous attempt had the following citation issues:\n${problems.join(
        '\n'
      )}\nEnsure every cited file exists and all line numbers exist in the numbered files above. Respond with corrected JSON only.`;
    } catch (err) {
      console.warn(`Challenge generation error on attempt ${attempt + 1}:`, err);
      if (err instanceof Error) {
        lastProblems = [err.message];
      }
    }
  }

  throw new ChallengeGenerationError(
    "Couldn't generate a valid challenge for this flow; please try another flow.",
    lastProblems
  );
}

export function generateChallengeFallback(
  files: Record<string, string>,
  flow: Flow
): Challenge {
  const flowFiles = selectFlowFiles(files, flow);
  const fileKeys = Object.keys(flowFiles);
  const primaryFile = files[flow.routeFile] ? flow.routeFile : fileKeys[0] || Object.keys(files)[0];
  const content = files[primaryFile] || '';
  const lines = content.split('\n');
  const lineCount = Math.max(1, lines.length);

  let startL1 = 1;
  let endL1 = Math.min(Math.max(1, Math.min(5, lineCount)), lineCount);
  let startL2 = Math.min(Math.max(1, Math.floor(lineCount / 2)), lineCount);
  let endL2 = Math.min(startL2 + 4, lineCount);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/import|require/.test(l)) {
      startL1 = i + 1;
      endL1 = Math.min(i + 3, lineCount);
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/export|function|const\s+\w+\s*=|router\.|app\.|Route|<[A-Z]/.test(l)) {
      startL2 = i + 1;
      endL2 = Math.min(i + 5, lineCount);
      break;
    }
  }

  return {
    question: `Explain step-by-step how the ${flow.label} flow is structured and executed in ${primaryFile}. What dependencies does it import, and what behavior or output does it produce?`,
    expectedFacts: [
      {
        id: 'fact_1',
        fact: `${primaryFile} sets up module dependencies and declarations required for the ${flow.tag} flow`,
        file: primaryFile,
        startLine: startL1,
        endLine: endL1,
      },
      {
        id: 'fact_2',
        fact: `${primaryFile} executes core component logic, route dispatching, or state transformations for ${flow.tag}`,
        file: primaryFile,
        startLine: startL2,
        endLine: endL2,
      },
    ],
  };
}

export function evaluateFlowAnswerLocally(
  question: string,
  expectedFacts: ExpectedFact[],
  flowFiles: Record<string, string>,
  studentAnswer: string
): Grade {
  const lowerAnswer = studentAnswer.toLowerCase().trim();
  const words = lowerAnswer.split(/\s+/).filter(Boolean);

  const covered: string[] = [];
  const missed: string[] = [];

  for (const fact of expectedFacts) {
    const factText = fact.fact.toLowerCase();
    const factKeywords = factText
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['with', 'from', 'that', 'this', 'into', 'user', 'calls', 'when', 'does', 'then'].includes(w));

    // Match if student answer contains at least 2 key terms or significant phrase from fact
    const matchCount = factKeywords.filter((kw) => lowerAnswer.includes(kw)).length;
    const isCovered = factKeywords.length > 0 && matchCount >= Math.min(2, factKeywords.length);

    if (isCovered && words.length >= 6) {
      covered.push(fact.id);
    } else {
      missed.push(fact.id);
    }
  }

  const fraction = expectedFacts.length > 0 ? covered.length / expectedFacts.length : 0;
  const score = Math.round(fraction * 10);
  const verdict = score >= 7 ? 'correct' : score >= 4 ? 'partial' : 'incorrect';

  const citations = expectedFacts.map((f) => ({
    file: f.file,
    startLine: f.startLine,
    endLine: f.endLine,
  }));

  const feedback =
    verdict === 'correct'
      ? `Great explanation! You accurately explained the key execution steps in this flow.`
      : verdict === 'partial'
      ? `Partially correct. You addressed some behavior, but missed key steps in the flow.`
      : `The answer is incorrect or does not address what actually happens in this code flow. Low points assigned.`;

  const followUpQuestion =
    missed.length > 0
      ? `Take a look at ${expectedFacts.find((f) => f.id === missed[0])?.file || 'the route file'}. What happens during that step?`
      : null;

  return {
    score,
    maxScore: 10,
    verdict,
    covered,
    missed,
    feedback,
    citations,
    followUpQuestion,
  };
}

export async function generateGrade(
  question: string,
  expectedFacts: ExpectedFact[],
  flowFiles: Record<string, string>,
  studentAnswer: string,
  options?: { openaiClient?: OpenAI }
): Promise<Grade> {
  let prompt = buildGradingPrompt(question, expectedFacts, flowFiles, studentAnswer);
  let lastProblems: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await askLLM(prompt, { openaiClient: options?.openaiClient });
      const parsed = GradeSchema.parse(response.data);
      const problems = validateGrade(parsed, expectedFacts, flowFiles);

      if (problems.length === 0) {
        return parsed;
      }

      lastProblems = problems;
      console.warn(`Grade validation failed on attempt ${attempt + 1}:`, problems);

      prompt = `${prompt}\n\nIMPORTANT: Your previous grading had the following validation issues:\n${problems.join(
        '\n'
      )}\nPlease fix these issues and respond with valid JSON only.`;
    } catch (err) {
      console.warn(`Grading generation error on attempt ${attempt + 1}:`, err);
      if (err instanceof Error) {
        lastProblems = [err.message];
      }
    }
  }

  console.warn('Falling back to strict local grading for flow answer:', lastProblems);
  return evaluateFlowAnswerLocally(question, expectedFacts, flowFiles, studentAnswer);
}
