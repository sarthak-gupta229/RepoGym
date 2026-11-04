import OpenAI from 'openai';
import { Flow, selectFlowFiles } from './select';
import { buildChallengePrompt, buildGradingPrompt, PastResult } from './prompt';
import { askLLM } from './llm';
import {
  Challenge,
  ChallengeSchema,
  Grade,
  GradeSchema,
  ExpectedFact,
} from './schemas';
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
  options?: { openaiClient?: OpenAI }
): Promise<Challenge> {
  const flowFiles = selectFlowFiles(files, flow);
  let prompt = buildChallengePrompt(flowFiles, flow.label, flow.routeFile, pastResults);

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

  throw new GradingError(
    "Couldn't grade this answer; your answer is saved.",
    lastProblems
  );
}
