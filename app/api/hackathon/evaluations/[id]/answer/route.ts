import { NextRequest, NextResponse } from 'next/server';
import { store, HackathonCriterionResult } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';
import {
  evaluateHackathonAnswer,
  generateHackathonQuestion,
  HACKATHON_CRITERIA,
} from '@/lib/hackathon';
import { HackathonQuestion } from '@/lib/schemas';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const evaluation = await store.getHackathonEvaluation(id);
  if (!evaluation) {
    return NextResponse.json({ error: 'Hackathon evaluation not found' }, { status: 404 });
  }

  if (evaluation.status === 'completed') {
    return NextResponse.json({ error: 'This hackathon evaluation is already completed' }, { status: 400 });
  }

  const analysis = await store.getAnalysis(evaluation.analysis_id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis data not found' }, { status: 404 });
  }

  const repo = await store.getRepo(evaluation.repo_id);
  const repoName = repo ? `${repo.owner}/${repo.name}` : 'demo/login-service';

  try {
    const body = await req.json();
    const { answer, question } = body;

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return NextResponse.json({ error: 'Defense answer must not be empty' }, { status: 400 });
    }

    if (answer.length > 4000) {
      return NextResponse.json({ error: 'Answer exceeds the 4,000 character limit' }, { status: 400 });
    }

    const currentIndex = evaluation.current_criterion_index;
    const currentCriterion = HACKATHON_CRITERIA[currentIndex];

    // Use question provided in body or fallback to default
    const activeQuestion: HackathonQuestion = question || {
      criterionId: currentCriterion.id,
      criterionTitle: currentCriterion.title,
      weight: currentCriterion.weight,
      question: currentCriterion.defaultQuestion(repoName, Object.keys(analysis.file_map)),
      rubricPoints: currentCriterion.defaultRubric,
      suggestedFileFocus: Object.keys(analysis.file_map).slice(0, 2),
    };

    // Evaluate answer with hackathon judging logic
    const grade = await evaluateHackathonAnswer(
      activeQuestion,
      answer,
      analysis.file_map,
      repoName
    );

    const criterionResult: HackathonCriterionResult = {
      criterion_id: currentCriterion.id,
      criterion_title: currentCriterion.title,
      weight: currentCriterion.weight,
      question: activeQuestion.question,
      rubric_points: activeQuestion.rubricPoints,
      user_answer: answer,
      score: grade.score,
      weighted_score: grade.weightedScore,
      verdict: grade.verdict,
      strengths: grade.strengths,
      gaps: grade.gaps,
      feedback: grade.feedback,
      judge_tips: grade.judgeTips,
      suggested_files: activeQuestion.suggestedFileFocus,
    };

    const updatedResults = [...evaluation.criterion_results, criterionResult];
    const totalScore = Math.round(
      updatedResults.reduce((acc, r) => acc + r.weighted_score, 0) * 10
    ) / 10;

    const nextIndex = currentIndex + 1;
    const isCompleted = nextIndex >= HACKATHON_CRITERIA.length;

    let nextQuestion: HackathonQuestion | null = null;
    if (!isCompleted) {
      nextQuestion = await generateHackathonQuestion(
        analysis.file_map,
        repoName,
        nextIndex
      );
    }

    const updatedEvaluation = await store.updateHackathonEvaluation(evaluation.id, {
      criterion_results: updatedResults,
      total_score: totalScore,
      current_criterion_index: nextIndex,
      status: isCompleted ? 'completed' : 'in_progress',
    });

    return NextResponse.json({
      evaluation: updatedEvaluation,
      result: criterionResult,
      nextQuestion,
      completed: isCompleted,
    });
  } catch (err) {
    console.error('Failed to evaluate hackathon defense answer:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Evaluation failed. Answer preserved.' },
      { status: 500 }
    );
  }
}
