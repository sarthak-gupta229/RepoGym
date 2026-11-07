import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await store.getUserSessions(user.id);
  const attempts = Array.from(store.attempts.values()).filter((a) => a.user_id === user.id);
  const feedbackList = Array.from(store.feedback.values()).filter((f) => f.user_id === user.id);

  // Score trend across completed sessions
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const scoreTrend = await Promise.all(
    completedSessions.map(async (s) => {
      const sessionQuestions = await store.getQuestionsForSession(s.id);
      const questionIds = new Set(sessionQuestions.map((q) => q.id));
      const sessionAttempts = attempts.filter((a) => questionIds.has(a.question_id));
      const totalScore = sessionAttempts.reduce((acc, a) => acc + a.score, 0);
      const maxScore = sessionAttempts.reduce((acc, a) => acc + a.max_score, 0) || 10;
      return {
        sessionId: s.id,
        flowTag: s.flow_tag,
        date: s.created_at,
        score: totalScore,
        maxScore,
        percentage: Math.round((totalScore / maxScore) * 100),
      };
    })
  );

  // Misses grouped by flow_tag
  const missesByTag: Record<string, number> = {};
  for (const att of attempts) {
    const question = await store.getQuestion(att.question_id);
    const tag = question?.flow_tag || 'general';
    missesByTag[tag] = (missesByTag[tag] || 0) + (att.missed ? att.missed.length : 0);
  }

  // Find most-missed topic
  let mostMissedTopic: string | null = null;
  let maxMisses = 0;
  for (const [tag, count] of Object.entries(missesByTag)) {
    if (count > maxMisses) {
      maxMisses = count;
      mostMissedTopic = tag;
    }
  }

  // 1. Detailed Hackathon Evaluations with complete marks, questions, answers, and corrections
  const rawHackathons = await store.getUserHackathonEvaluations(user.id);
  const hackathonEvaluations = await Promise.all(
    rawHackathons.map(async (h) => {
      const repo = await store.getRepo(h.repo_id);
      return {
        id: h.id,
        repoId: h.repo_id,
        repoName: repo ? `${repo.owner}/${repo.name}` : (h.repo_id === 'repo-demo' ? 'demo/login-service' : 'Unknown Project'),
        analysisId: h.analysis_id,
        status: h.status,
        totalScore: h.total_score,
        totalCriteria: h.total_criteria,
        currentCriterionIndex: h.current_criterion_index,
        resultsCount: h.criterion_results?.length || 0,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
        criterionResults: h.criterion_results || [],
      };
    })
  );

  // 2. Detailed Project Comprehension Sessions with full attempts, scores, and code citations
  const projectSessions = await Promise.all(
    sessions.map(async (s) => {
      const analysis = await store.getAnalysis(s.analysis_id);
      const repo = analysis ? await store.getRepo(analysis.repo_id) : null;
      const repoName = repo ? `${repo.owner}/${repo.name}` : 'demo/login-service';
      const sessionQuestions = await store.getQuestionsForSession(s.id);
      const questionIds = new Set(sessionQuestions.map((q) => q.id));
      const sessionAttempts = attempts.filter((a) => questionIds.has(a.question_id));

      const totalScore = Math.round(sessionAttempts.reduce((acc, a) => acc + a.score, 0) * 10) / 10;
      const maxScore = sessionAttempts.reduce((acc, a) => acc + a.max_score, 0) || (s.total_questions * 10);
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      const detailedQuestions = sessionQuestions.map((q) => {
        const attempt = sessionAttempts.find((a) => a.question_id === q.id) || null;
        return {
          id: q.id,
          position: q.position,
          question: q.question,
          expectedFacts: q.expected_facts || [],
          attempt: attempt
            ? {
                id: attempt.id,
                answer: attempt.answer,
                score: attempt.score,
                maxScore: attempt.max_score,
                verdict: attempt.verdict,
                covered: attempt.covered || [],
                missed: attempt.missed || [],
                feedback: attempt.feedback,
                citations: attempt.citations || [],
                followUpQuestion: attempt.follow_up_question,
                createdAt: attempt.created_at,
              }
            : null,
        };
      });

      return {
        id: s.id,
        repoId: repo?.id || 'repo-demo',
        repoName,
        flowTag: s.flow_tag,
        status: s.status,
        totalQuestions: s.total_questions,
        currentIndex: s.current_index,
        score: totalScore,
        maxScore,
        percentage,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        questions: detailedQuestions,
        answeredCount: sessionAttempts.length,
      };
    })
  );

  // Compute summary stats
  const completedHackathons = hackathonEvaluations.filter((h) => h.status === 'completed');
  const completedProjectList = projectSessions.filter((p) => p.status === 'completed');

  const avgHackathonScore =
    completedHackathons.length > 0
      ? Math.round(
          (completedHackathons.reduce((acc, h) => acc + h.totalScore, 0) / completedHackathons.length) * 10
        ) / 10
      : 0;

  const avgProjectScore =
    completedProjectList.length > 0
      ? Math.round(
          completedProjectList.reduce((acc, p) => acc + p.percentage, 0) / completedProjectList.length
        )
      : 0;

  return NextResponse.json({
    sessionsCount: sessions.length,
    completedSessionsCount: completedSessions.length,
    scoreTrend,
    missesByTag,
    suggestedFocus: mostMissedTopic,
    feedbackCount: feedbackList.length,
    hackathonEvaluations,
    projectSessions,
    summaryStats: {
      totalCompletedHackathons: completedHackathons.length,
      totalCompletedProjectSessions: completedProjectList.length,
      avgHackathonScore,
      avgProjectScore,
    },
  });
}
