import { z } from 'zod';

export const ExpectedFactSchema = z.object({
  id: z.string().min(1),
  fact: z.string().min(1),
  file: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
});

export const ChallengeSchema = z.object({
  question: z.string().min(5),
  expectedFacts: z.array(ExpectedFactSchema).min(1),
});

export const CitationSchema = z.object({
  file: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
});

export const GradeSchema = z.object({
  score: z.number().min(0),
  maxScore: z.number().positive(),
  verdict: z.enum(['correct', 'partial', 'incorrect']),
  covered: z.array(z.string()),
  missed: z.array(z.string()),
  feedback: z.string().min(1),
  citations: z.array(CitationSchema),
  followUpQuestion: z.string().nullable(),
});

export type ExpectedFact = z.infer<typeof ExpectedFactSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type Grade = z.infer<typeof GradeSchema>;

