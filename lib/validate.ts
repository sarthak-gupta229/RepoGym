import { Challenge, Grade, ExpectedFact, Citation } from './schemas';

export function validateLineRange(
  file: string,
  startLine: number,
  endLine: number,
  files: Record<string, string>
): string | null {
  if (!files[file]) {
    return `Cited file "${file}" does not exist in the file map.`;
  }

  if (startLine > endLine) {
    return `In file "${file}", startLine (${startLine}) is greater than endLine (${endLine}).`;
  }

  const lineCount = files[file].split('\n').length;
  if (startLine < 1 || endLine > lineCount) {
    return `In file "${file}", range ${startLine}-${endLine} is out of bounds (file has ${lineCount} lines).`;
  }

  return null;
}

export function validateChallenge(
  challenge: Challenge,
  files: Record<string, string>
): string[] {
  const problems: string[] = [];

  if (!challenge.question || challenge.question.trim().length === 0) {
    problems.push('Question is empty.');
  }

  if (!challenge.expectedFacts || challenge.expectedFacts.length === 0) {
    problems.push('Expected facts array is empty.');
  }

  const factIds = new Set<string>();
  for (const fact of challenge.expectedFacts || []) {
    if (factIds.has(fact.id)) {
      problems.push(`Duplicate fact ID "${fact.id}".`);
    }
    factIds.add(fact.id);

    const rangeErr = validateLineRange(fact.file, fact.startLine, fact.endLine, files);
    if (rangeErr) {
      problems.push(rangeErr);
    }
  }

  return problems;
}

export function validateGrade(
  grade: Grade,
  expectedFacts: ExpectedFact[],
  files: Record<string, string>
): string[] {
  const problems: string[] = [];

  if (grade.score < 0 || grade.score > grade.maxScore) {
    problems.push(`Score (${grade.score}) must be between 0 and maxScore (${grade.maxScore}).`);
  }

  const expectedIds = new Set(expectedFacts.map((f) => f.id));

  for (const id of grade.covered) {
    if (!expectedIds.has(id)) {
      problems.push(`Covered fact ID "${id}" does not exist in expected facts.`);
    }
  }

  for (const id of grade.missed) {
    if (!expectedIds.has(id)) {
      problems.push(`Missed fact ID "${id}" does not exist in expected facts.`);
    }
  }

  for (const citation of grade.citations) {
    const rangeErr = validateLineRange(citation.file, citation.startLine, citation.endLine, files);
    if (rangeErr) {
      problems.push(rangeErr);
    }
  }

  return problems;
}

