import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { generateGrade } from '@/lib/generate';
import { selectFlowFiles } from '@/lib/select';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: questionId } = await params;
  const question = await store.getQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  const session = await store.getSession(question.session_id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const analysis = await store.getAnalysis(question.analysis_id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { answer } = body;

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json({ error: 'Answer must be provided' }, { status: 400 });
    }

    // PRD F6: Reject answers over 2,000 characters
    if (answer.length > 2000) {
      return NextResponse.json(
        { error: 'Answer exceeds the 2,000 character limit' },
        { status: 400 }
      );
    }

    // Find the flow for this question
    const flow =
      analysis.flows.find((f) => f.tag === question.flow_tag) ||
      analysis.flows[0];
    const flowFiles = selectFlowFiles(analysis.file_map, flow);

    // Call grading engine
    const grade = await generateGrade(
      question.question,
      question.expected_facts,
      flowFiles,
      answer
    );

    // Save attempt
    const attempt = await store.createAttempt({
      question_id: question.id,
      user_id: user.id,
      answer,
      score: grade.score,
      max_score: grade.maxScore,
      verdict: grade.verdict,
      covered: grade.covered,
      missed: grade.missed,
      feedback: grade.feedback,
      citations: grade.citations,
      follow_up_question: grade.followUpQuestion,
    });

    // If this was the last question in session, mark session completed
    let isCompleted = false;
    if (question.position >= session.total_questions) {
      await store.updateSession(session.id, { status: 'completed' });
      isCompleted = true;
    }

    return NextResponse.json({
      attempt,
      grade,
      sessionCompleted: isCompleted,
    });
  } catch (err) {
    console.error('Grading error:', err);
    return NextResponse.json(
      { error: "Couldn't grade this answer; your answer is saved." },
      { status: 500 }
    );
  }
}

