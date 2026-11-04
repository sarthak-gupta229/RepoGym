export type AnalyticsEvent =
  | { event: 'repo_analyzed'; repoId: string; fileCount: number; durationMs: number }
  | { event: 'session_started'; sessionId: string; flowTag: string }
  | { event: 'session_completed'; sessionId: string; totalScore: number }
  | { event: 'question_generated'; questionId: string; flowTag: string; valid: boolean }
  | { event: 'grade_returned'; verdict: string; score: number }
  | { event: 'feedback_recorded'; attemptId: string; helpful: boolean }
  | { event: 'error'; type: string; message: string };

export function logAnalytics(event: AnalyticsEvent): void {
  // Never log file contents or student answers
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...event }));
}

