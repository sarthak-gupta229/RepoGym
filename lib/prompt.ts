export function numberLines(content: string): string {
  const lines = content.split('\n');
  return lines.map((line, idx) => `${idx + 1}: ${line}`).join('\n');
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const MAX_PROMPT_TOKENS = 30000;

export interface PastResult {
  flowTag: string;
  verdict: string;
  missedIds: string[];
}

export function buildPrompt(
  files: Record<string, string>,
  task: string,
  options?: {
    pastResults?: PastResult[];
    priorityFile?: string;
  }
): string {
  const priorityFile = options?.priorityFile;
  const fileEntries = Object.entries(files);

  // If budget might be exceeded, order files so priorityFile is kept and larger/secondary files are dropped first
  fileEntries.sort(([pathA], [pathB]) => {
    if (pathA === priorityFile) return -1;
    if (pathB === priorityFile) return 1;
    return 0;
  });

  const generateBody = (activeFiles: [string, string][]) => {
    const fileBlocks = activeFiles
      .map(([path, content]) => `<file path="${path}">\n${numberLines(content)}\n</file>`)
      .join('\n\n');

    let pastContext = '';
    if (options?.pastResults && options.pastResults.length > 0) {
      pastContext = `\nPast session performance:\n` +
        options.pastResults
          .map((r, i) => `Question ${i + 1}: Flow [${r.flowTag}], Result: ${r.verdict}, Missed topics: ${r.missedIds.join(', ') || 'none'}`)
          .join('\n') +
        `\nNote: If the student had missed topics in previous questions, adapt this question to reinforce understanding without repeating past flows.\n`;
    }

    return `${task}\n${pastContext}\nCode files for this flow:\n\n${fileBlocks}`;
  };

  let activeFiles = [...fileEntries];
  let promptText = generateBody(activeFiles);

  // If prompt exceeds token budget, drop least relevant files from the end until under budget
  while (estimateTokens(promptText) > MAX_PROMPT_TOKENS && activeFiles.length > 1) {
    activeFiles.pop();
    promptText = generateBody(activeFiles);
  }

  return promptText;
}

export function buildChallengePrompt(
  flowFiles: Record<string, string>,
  flowLabel: string,
  routeFile: string,
  pastResults?: PastResult[],
  options?: { difficulty?: 'easy' | 'medium' | 'hard' }
): string {
  const isEasy = options?.difficulty === 'easy';

  const easyDifficultyGuideline = isEasy
    ? `
DIFFICULTY LEVEL: BEGINNER FRIENDLY / ACCESSIBLE
Make this challenge approachable, encouraging, and easy for a beginner:
- Focus the question on a single clear, high-level action, condition check, or return status in this flow (e.g., "What does this route check first?", "What response or status code is returned if the credentials are invalid?", "In simple terms, what happens when this request succeeds?").
- Avoid overly broad, multi-part, or pedantic questions. Keep the question concise and direct.
- Formulate only 2 clear, accessible "expectedFacts" that focus on the primary behavior.
- In the "question" text itself, include a gentle hint pointing the student to the key file (e.g., "Hint: Check what happens in ${routeFile}").
- If past questions already covered this flow, focus on a different aspect (e.g. error handling, another check, or return structure) to avoid repeating the exact same question.
`
    : '';

  const task = `You are a technical code evaluator for RepoGym.
Create an interactive comprehension challenge for the request flow "${flowLabel}".
The goal is to test whether a developer genuinely understands what happens in this code when the request is processed.${easyDifficultyGuideline}

Requirements:
1. Ask one clear, conceptual or technical question about the execution flow, business logic, authentication, or data flow in this request.
2. Formulate 2 to 4 "expectedFacts" that a complete, correct answer should mention.
3. For each fact:
   - "id": A unique string ID, e.g. "fact_1", "fact_2", etc.
   - "fact": A concise summary of the key fact or code behavior.
   - "file": The exact file path from the provided code where this happens.
   - "startLine": The starting line number (1-based integer).
   - "endLine": The ending line number (1-based integer).
4. CRITICAL: Every cited file MUST be one of the files provided below.
5. CRITICAL: Every startLine and endLine must accurately match the lines in the numbered code blocks below.

Respond with valid JSON only in this format:
{
  "question": "What happens when ...?",
  "expectedFacts": [
    {
      "id": "fact_1",
      "fact": "...",
      "file": "routes/login.js",
      "startLine": 8,
      "endLine": 8
    }
  ]
}`;

  return buildPrompt(flowFiles, task, { priorityFile: routeFile, pastResults });
}

export function buildGradingPrompt(
  question: string,
  expectedFacts: Array<{ id: string; fact: string; file: string; startLine: number; endLine: number }>,
  flowFiles: Record<string, string>,
  studentAnswer: string
): string {
  const factsList = expectedFacts
    .map((f) => `- [${f.id}] (${f.file} L${f.startLine}-${f.endLine}): ${f.fact}`)
    .join('\n');

  const task = `You are an encouraging and supportive code tutor for RepoGym.
Grade the student's answer against the actual code and expected facts.

Question:
"${question}"

Expected Facts:
${factsList}

Student Answer:
"${studentAnswer}"

Grading Philosophy & Rules:
1. "maxScore" should be 10.
2. "score": Assign an integer between 0 and 10 based on how many expected facts the student adequately addressed.
   - GRADE LENIENTLY AND GENEROUSLY: The student is learning the repository.
   - Accept explanations in plain, conversational English.
   - The student does NOT need to write verbatim code syntax, declare variable types, or quote exact function or variable names.
   - If they capture the conceptual idea or general intent (e.g. "it finds the user by email" or "it checks password hash with bcrypt" or "returns an error if invalid"), consider that fact COVERED and award credit.
3. "verdict": 
   - "correct" if score >= 7 (the student understood the general flow and primary facts).
   - "partial" if score is between 4 and 6.
   - "incorrect" if score <= 3 (only if the answer is completely missing, unrelated, or contradicts the code).
4. "covered": Array of expected fact IDs (e.g. ["fact_1"]) that the student correctly explained or touched upon conceptually.
5. "missed": Array of expected fact IDs that the student did not mention or got substantially wrong.
   - Note: Every fact ID in expected facts must appear in either "covered" or "missed".
6. "feedback": A supportive, constructive 1 to 3 sentence explanation. Always start with an encouraging sentence celebrating what they got right, followed by a friendly clarification of anything they missed.
7. "citations": Array of objects { "file": string, "startLine": number, "endLine": number } supporting your feedback.
   - Must cite existing files and valid line numbers from the code below.
8. "followUpQuestion": If verdict is "partial" or "incorrect", ask a simple, friendly hint or follow-up question prompting the student to think about one of the missed facts. If verdict is "correct", return null.

Respond with valid JSON only in this format:
{
  "score": 10,
  "maxScore": 10,
  "verdict": "correct",
  "covered": ["fact_1", "fact_2"],
  "missed": [],
  "feedback": "...",
  "citations": [
    { "file": "routes/login.js", "startLine": 8, "endLine": 11 }
  ],
  "followUpQuestion": null
}`;

  return buildPrompt(flowFiles, task);
}

