'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { EVENTS, Joyride, type Step } from 'react-joyride';

function tip(target: string, title: string, content: ReactNode): Step {
  return { target: `[data-tour="${target}"]`, title, content };
}

const chapters = {
  home: [
    tip('welcome', 'Welcome to RepoGym', 'Explore how a codebase fits together, then practice explaining its behavior in a Flow Session or defend the project in Hackathon Jury Mode.'),
    tip('analyze', 'Analyze your own repository', 'Paste a public GitHub repository URL and select Analyze Repo. RepoGym maps supported JavaScript, TypeScript, and Python files and their local imports. Start with a small repo if you are new to tracing code.'),
    tip('recent', 'Pick up where you left off', 'Open a recently visited repository here, or use the Dashboard to find your repositories and evaluation history.'),
    tip('account', 'Account and appearance', 'Switch between light and dark themes here. Sign in to use your own history, select your account to open the Dashboard, or sign out when you are done.'),
    tip('demo', 'Try the guided demo', <>
      <p>The demo is an Express login service. Follow its login route from the request to the credential check and response.</p>
      <Link href="/repos/demo?tour=repo" className="mt-3 inline-block font-semibold underline underline-offset-4">Open the guided demo →</Link>
    </>),
  ],
  repo: [
    tip('repo-graph', 'Read the dependency graph', 'Each node is a source file and each arrow is a local import. Select a node to inspect its code and connections, or select an edge to see the import statement. Drag the canvas to pan and use the zoom, fit, and minimap controls to move around.'),
    tip('repo-files', 'Find files in the explorer', 'In Files, search by path, open individual folders, or use Expand and Collapse to change the whole tree. Select a file to read its source.'),
    tip('repo-connections', 'Inspect local connections', 'In Connections, Imports are outgoing and Imported By is incoming. Select a listed file to follow the connection. This panel also lists exported names and external dependencies when available.'),
    tip('repo-source', 'Read the source', 'Select a graph node or a file in the explorer to open its line-numbered code. Follow imports from the entry point before reading supporting files.'),
    tip('repo-highlight', 'Highlight a request flow', 'Use Highlight Flow to mark the files involved in the active request flow. Select it again to clear the highlight.'),
    tip('repo-filter', 'Focus on fewer files', 'Toggle between the active flow and all files. Flow Only makes it easier to follow relevant connections in a large graph.'),
    tip('repo-practice', 'Practice code comprehension', 'Choose the question count and select Start Flow Session. Explain what the code does in plain English. Open Tutorial on the session screen for guidance on answering and reading grades.'),
    tip('repo-defense', 'Practice a hackathon defense', 'Choose Hackathon Eval to rehearse explaining the project to a jury. Open Tutorial there to learn the rubric, timer, and feedback controls.'),
  ],
  practice: [
    tip('practice-progress', 'Track your progress', 'The header shows where you are in the session. Open Tutorial after submitting to see how to read your feedback.'),
    tip('practice-graph', 'Trace the highlighted code', 'Start with the highlighted files. Follow their imports to find the checks, function calls, and outcomes the question asks about. Select a node to open its source.'),
    tip('practice-source', 'Check the exact lines', 'Use this pane to inspect selected files. When you select a citation in a grade, the cited lines are highlighted here.'),
    tip('practice-hint', 'Use a hint when stuck', 'Guide Hint gives you a trace to follow. Look for the input, what gets validated, and what happens on success or failure.'),
    tip('practice-question', 'Read or listen to the question', 'Identify the behavior the question asks you to trace. Use the speaker button to hear it read aloud.'),
    tip('practice-answer', 'Explain the flow in order', 'Type your answer or choose Voice Input, allow microphone access, and stop recording to review the transcript. Template replaces your text with an outline. Submit Answer when ready and use Retry if grading fails.'),
    tip('practice-grade', 'Understand the grade', 'Read the score, verdict, and critique. Try answering any follow-up reflection after checking what you missed.'),
    tip('practice-citations', 'Verify the citations', 'Select a file and line reference to highlight the evidence in the graph and code viewer. Compare the actual code with your explanation.'),
    tip('practice-feedback', 'Rate the feedback', 'Use Yes or No to say whether the grade helped. If you find a discrepancy, choose No and add an optional note.'),
    tip('practice-next', 'Continue when ready', 'Review the feedback before selecting Next Question. After the final question, use the session summary and Dashboard to review your performance.'),
    tip('practice-summary', 'Review your completed session', 'Check the total score and verdict breakdown. Open the Dashboard for past sessions, corrections, and suggested practice when available.'),
  ],
  defense: [
    tip('defense-progress', 'Follow the six jury criteria', 'The tracker shows completed, current, and upcoming rounds. Each criterion has a weight, and the weighted scores add up to a maximum of 100 points.'),
    tip('defense-timer', 'Rehearse with the 10-minute timer', 'Start when ready, then pause or resume as needed. Warnings appear at 2 minutes and 30 seconds. The clock restores after refresh in this browser. Reset only affects the clock, and you can still submit at 00:00.'),
    tip('defense-files', 'Use code as evidence', 'Open Repository Files, search for a path, and select a file to see its source. Point to a concrete implementation or user flow in your defense.'),
    tip('defense-rubric', 'Read what the jury is looking for', 'Check the active criterion and its rubric. Explain the problem, the reasoning behind your choices, and what the prototype demonstrates when relevant.'),
    tip('defense-question', 'Prepare for the judge’s question', 'Read or listen to the question and use its rubric points as a checklist. Address the prompt directly before adding context.'),
    tip('defense-answer', 'Deliver your defense', 'Type your response or choose Voice Input, allow microphone access, and stop recording to review the transcript. Submit Defense to Jury when ready. Reopen Tutorial after grading for help with the feedback.'),
    tip('defense-grade', 'Use the jury feedback', 'Compare your score with the criterion weight. Review strengths, gaps, and judge tips, then select Proceed to Next Criterion.'),
    tip('defense-summary', 'Read your final scorecard', 'Compare weighted scores across the six criteria and identify the round you would rehearse again. Open the Dashboard to revisit the evaluation later.'),
  ],
  dashboard: [
    tip('dashboard-metrics', 'Get your bearings', 'See repositories tracked, sessions run, completed runs, and a suggested focus when one is available.'),
    tip('dashboard-repos', 'Reopen a repository', 'Select a repository to make it the active project. Use Graph to return to the explorer or use the evaluation shortcuts to start practice. If the list is empty, analyze your first repository.'),
    tip('dashboard-modes', 'Choose the right practice mode', 'Pick a project, then choose Hackathon Evaluation for a jury defense or Project Evaluation for code comprehension. Resume an existing run when offered, or start a new one.'),
    tip('dashboard-archive', 'Find scores and corrections', 'Filter the archive by evaluation type or show completed runs only.'),
    tip('dashboard-record', 'Review an evaluation record', 'Select View Marks & Corrections to compare your answers with the feedback. Select Open to continue the evaluation or review its scorecard.'),
    tip('dashboard-focus', 'Practice a missed topic', 'When RepoGym suggests a focus, use Start Targeted Session to practice that flow.'),
    tip('dashboard-history', 'Compare past results', 'Check the flow, score, and verdict of completed comprehension sessions to see where you improved and what still needs practice.'),
  ],
  account: [
    tip('auth-mode', 'Sign in or create an account', 'Choose Sign In for an existing account or Sign Up to create one. Your account gives you access to your repository and evaluation history.'),
    tip('auth-demo', 'Try the demo account', 'One-click sign-in opens the shared demo account. Use your own account for personal practice history.'),
    tip('auth-github', 'Continue with GitHub', 'Use GitHub sign-in when it is configured for this RepoGym instance. You can also use the email form.'),
    tip('auth-form', 'Use email and password', 'Enter your account details and submit the form. For a new account, confirm your password. Once signed in, use the Dashboard to return to your repositories and evaluations.'),
  ],
};

type Chapter = keyof typeof chapters;

export function Tutorial({ chapter }: { chapter: Chapter }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const start = useCallback(() => {
    setSteps(chapters[chapter].filter((step) =>
      typeof step.target === 'string' && document.querySelector(step.target)?.getClientRects().length,
    ));
  }, [chapter]);

  useEffect(() => {
    if (chapter !== 'repo') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('tour') !== 'repo') return;

    const frame = window.requestAnimationFrame(() => {
      url.searchParams.delete('tour');
      window.history.replaceState(null, '', url);
      start();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chapter, start]);

  useEffect(() => {
    if (!steps?.length) return;

    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSteps(null);
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [steps]);

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="cursor-pointer whitespace-nowrap border border-border-secondary px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text hover:bg-cell-hover focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {chapter === 'home' ? 'Take a tour' : 'Tutorial'}
      </button>
      {steps && steps.length > 0 && (
        <Joyride
          run
          continuous
          scrollToFirstStep
          steps={steps}
          onEvent={(event) => {
            if (event.type === EVENTS.TOUR_END) setSteps(null);
          }}
          locale={{ skip: 'Skip tutorial', last: 'Done' }}
          options={{
            skipBeacon: true,
            showProgress: true,
            buttons: ['back', 'skip', 'primary'],
            dismissKeyAction: false,
            overlayClickAction: false,
            blockTargetInteraction: true,
            backgroundColor: 'var(--theme-cell)',
            arrowColor: 'var(--theme-cell)',
            textColor: 'var(--theme-text)',
            primaryColor: 'var(--theme-text)',
            scrollOffset: 140,
            zIndex: 1000,
          }}
          styles={{
            tooltip: { border: '1px solid var(--theme-border-subtle)', borderRadius: 0 },
            tooltipContent: { fontSize: 14, lineHeight: 1.55 },
            buttonBack: { fontSize: 13 },
            buttonPrimary: { fontSize: 13 },
            buttonSkip: { fontSize: 13 },
          }}
        />
      )}
    </>
  );
}
