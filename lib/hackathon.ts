import OpenAI from 'openai';
import { askLLM } from './llm';
import {
  HackathonQuestion,
  HackathonQuestionSchema,
  HackathonGrade,
  HackathonGradeSchema,
} from './schemas';

export interface HackathonCriterion {
  id: string;
  title: string;
  weight: number; // Percentage (e.g. 25)
  subcriteria: string[];
  judgeFocus: string;
  defaultQuestion: (repoName: string, files: string[]) => string;
  defaultRubric: string[];
}

export const HACKATHON_CRITERIA: HackathonCriterion[] = [
  {
    id: 'problem_understanding',
    title: 'Problem Understanding & Identification',
    weight: 25,
    subcriteria: [
      'Does the team clearly understand the problem statement?',
      'Have they identified the actual root cause rather than just its symptoms?',
      'Can they explain who faces this problem and why it matters?',
      'Do they understand the target audience and its needs?',
    ],
    judgeFocus:
      'Prioritize evaluating root cause understanding, target audience needs, and why this problem urgently matters rather than superficial symptoms.',
    defaultQuestion: (repoName) =>
      `Regarding ${repoName}: What specific root-cause problem does this project address, who is the primary target audience facing it, and why does solving this problem urgently matter to them rather than just treating symptoms?`,
    defaultRubric: [
      'Identifies the actual root cause of the problem rather than just surface symptoms',
      'Explains clearly who the target audience is and what their specific needs are',
      'Articulates why solving this problem matters urgently in real life',
    ],
  },
  {
    id: 'solution_approach',
    title: 'Solution Approach & Problem-Solving',
    weight: 25,
    subcriteria: [
      'How effectively does the proposed solution address the identified problem?',
      'Is the approach logical and well thought out?',
      'Has the team considered alternative approaches?',
      'Can they justify why their solution is the right approach?',
      'How well does the solution handle real-world challenges?',
    ],
    judgeFocus:
      'Evaluate whether the approach is logical, how it handles real-world challenges, and the reasoning behind choosing this solution over alternatives.',
    defaultQuestion: (repoName) =>
      `How does your proposed solution in ${repoName} effectively solve the identified problem? What alternative approaches did your team consider, and what is your logical justification for choosing this specific solution?`,
    defaultRubric: [
      'Demonstrates a logical, step-by-step problem-solving approach',
      'Discusses alternative approaches considered and justifies the final choice',
      'Explains how the solution practically handles real-world friction and constraints',
    ],
  },
  {
    id: 'project_clarity',
    title: 'Project Understanding & Clarity',
    weight: 20,
    subcriteria: [
      'Can every team member explain what their project does?',
      'Can they clearly explain the project\'s workflow from beginning to end?',
      'Do they understand the purpose of each major feature?',
      'Can they explain how a user would interact with the solution?',
      'Can they confidently answer questions about their own project?',
    ],
    judgeFocus:
      'Assess end-to-end user workflow clarity, purpose of each major feature, user interaction flow, and confident grasp of what has been built.',
    defaultQuestion: (repoName) =>
      `Walk the judges through the complete end-to-end workflow of ${repoName}: from a user's first interaction to the final result, what does each major feature do and how does the user experience it?`,
    defaultRubric: [
      'Clear, end-to-end walkthrough of the user workflow from start to finish',
      'Clear explanation of the purpose and value of each major feature',
      'Demonstrates deep, confident understanding of the solution flow rather than memorized lines',
    ],
  },
  {
    id: 'creativity_innovation',
    title: 'Creativity & Innovation',
    weight: 15,
    subcriteria: [
      'Does the solution introduce a creative or unique approach?',
      'What differentiates it from existing solutions?',
      'Does it improve an existing process or introduce a new possibility?',
    ],
    judgeFocus:
      'Identify originality, unique differentiators against existing solutions, and whether it introduces an innovative improvement or new possibility.',
    defaultQuestion: (repoName) =>
      `What makes ${repoName} truly creative or innovative? How does your solution differentiate itself from existing solutions, and does it improve an existing process or introduce a completely new possibility?`,
    defaultRubric: [
      'Highlights a creative, distinct, or novel approach to the problem',
      'Articulates clear differentiation from existing market products or solutions',
      'Explains whether it improves an existing process or unlocks a new possibility',
    ],
  },
  {
    id: 'feasibility_impact',
    title: 'Practical Feasibility & Real-World Impact',
    weight: 10,
    subcriteria: [
      'Can the solution realistically be implemented and adopted?',
      'Does it have meaningful potential impact?',
      'Can it be improved or scaled in the future?',
      'Is it useful beyond the hackathon demonstration?',
    ],
    judgeFocus:
      'Assess real-world adoption practicality, meaningful potential impact, future scaling potential, and utility beyond the hackathon demo.',
    defaultQuestion: (repoName) =>
      `Beyond the hackathon demonstration, can ${repoName} realistically be implemented and adopted by real users? What is its potential real-world impact, and how can it scale sustainably in the future?`,
    defaultRubric: [
      'Demonstrates practical feasibility of real-world implementation and adoption',
      'Articulates meaningful, tangible potential impact on users',
      'Presents realistic potential for future scaling and utility beyond the hackathon',
    ],
  },
  {
    id: 'technical_implementation',
    title: 'Technical Implementation',
    weight: 5,
    subcriteria: [
      'Has the team successfully implemented the proposed solution, and does the working prototype demonstrate the core functionality they claim?',
    ],
    judgeFocus:
      'Strictly ONE technical evaluation question: verify whether the team has successfully implemented the solution and whether the working prototype demonstrates claimed core functionality.',
    defaultQuestion: (repoName) =>
      `Has your team successfully implemented the proposed solution for ${repoName}, and how does your working prototype demonstrate the core functionality you claim?`,
    defaultRubric: [
      'Confirms that the working prototype actually implements the claimed core functionality',
      'Shows concrete functional proof that the solution works as claimed',
      'Focuses on working prototype execution rather than technical jargon',
    ],
  },
];

export interface ProjectEvaluationMetric {
  id: string;
  title: string;
  weight: number;
  description: string;
  focus: string;
}

export const PROJECT_EVALUATION_METRICS: ProjectEvaluationMetric[] = [
  {
    id: 'flow_tracing',
    title: 'Code Execution & Flow Tracing',
    weight: 30,
    description: 'End-to-end request pipelines, handler chains, and runtime call hierarchy.',
    focus: 'Validating precise step-by-step execution order from entry route to database or external API.',
  },
  {
    id: 'dependency_topology',
    title: 'Architecture & Dependency Topology',
    weight: 25,
    description: 'Component modularity, relative imports, module boundaries, and caller/callee links.',
    focus: 'Graph DAG structure, circular import prevention, and cohesive layer separation.',
  },
  {
    id: 'business_logic',
    title: 'Business Logic & State Verification',
    weight: 20,
    description: 'Condition branches, data models, persistence, and state transitions.',
    focus: 'Accurate comprehension of domain validation, password hashing, and business operations.',
  },
  {
    id: 'error_handling',
    title: 'Error Handling & Edge Cases',
    weight: 15,
    description: 'Exception guarding, invalid input rejection, and fallback responses.',
    focus: 'Resilience against missing payloads, authentication failures, and service unavailability.',
  },
  {
    id: 'codebase_navigation',
    title: 'Codebase Navigation & File Line Precision',
    weight: 10,
    description: 'Pinpointing exact file paths and source lines backing runtime behavior.',
    focus: 'High-fidelity citation verification without hallucinating files or line ranges.',
  },
];

export async function generateHackathonQuestion(
  files: Record<string, string>,
  repoName: string,
  criterionIndex: number,
  options?: { openaiClient?: OpenAI }
): Promise<HackathonQuestion> {
  const index = Math.max(0, Math.min(criterionIndex, HACKATHON_CRITERIA.length - 1));
  const criterion = HACKATHON_CRITERIA[index];
  const filePaths = Object.keys(files);

  // Outline primary files summary (for general context only, not technical quiz)
  const sampleFiles = filePaths.slice(0, 10);
  const filesSummary = sampleFiles
    .map((p) => `- ${p}`)
    .join('\n');

  const prompt = `You are an expert Hackathon Head Judge evaluating the project "${repoName}".
You are currently evaluating the team on the following judging criterion:

CRITERION: "${criterion.title}" (${criterion.weight}% of total score)
SUB-CRITERIA:
${criterion.subcriteria.map((s) => `- ${s}`).join('\n')}

JUDGE FOCUS:
${criterion.judgeFocus}

IMPORTANT EVALUATION GUIDELINES & STRICT CONSTRAINTS:
The evaluation must prioritize problem understanding, solution quality, logical thinking, project clarity, and real-world applicability.
1. DO NOT conduct a technical interview.
2. DO NOT ask questions about programming languages, frameworks, libraries, APIs, databases, algorithms, or system architecture.
3. Ask questions that evaluate the team's understanding of the problem and their reasoning behind the proposed solution.
4. Evaluate whether team members genuinely understand what they have built rather than simply memorizing a presentation.
5. Focus on the problem, target audience, solution workflow, decision-making, innovation, and practical usefulness.
6. Technical implementation must have only ONE question, worth 5% of the total score (assessing whether the working prototype demonstrates claimed core functionality).
7. Questions should be understandable to participants from different technical backgrounds.
The objective is to evaluate how well teams THINK, UNDERSTAND, SOLVE, and PRESENT problems, not how much technical terminology they know.

PROJECT CONTEXT (for general reference only, do not quiz them on code syntax):
${filesSummary}

YOUR GOAL:
Formulate ONE clear, accessible, thought-provoking judge question testing this specific criterion:
- Problem Understanding & Identification (25%): Ask about the root cause vs symptoms, who faces the problem, and why it matters to the target audience.
- Solution Approach & Problem-Solving (25%): Ask about logical problem-solving, alternatives considered, and why their approach is justified in the real world.
- Project Understanding & Clarity (20%): Ask them to explain the complete workflow, purpose of major features, and how users interact with it.
- Creativity & Innovation (15%): Ask what makes their approach unique/differentiated and whether it improves a process or introduces a new possibility.
- Practical Feasibility & Real-World Impact (10%): Ask about realistic adoption, tangible impact, and future scaling beyond the hackathon.
- Technical Implementation (5%): Ask whether they successfully implemented the solution and how the working prototype demonstrates the core functionality claimed.

Respond with valid JSON only in this exact schema:
{
  "criterionId": "${criterion.id}",
  "criterionTitle": "${criterion.title}",
  "weight": ${criterion.weight},
  "question": "A clear, accessible judge question evaluating this criterion...",
  "rubricPoints": [
    "Rubric point 1",
    "Rubric point 2",
    "Rubric point 3"
  ],
  "suggestedFileFocus": ["${sampleFiles[0] || 'app.js'}"]
}`;

  try {
    const res = await askLLM<HackathonQuestion>(prompt, {
      openaiClient: options?.openaiClient,
      systemMessage: 'You are an experienced hackathon judge. Respond with valid JSON only.',
    });
    return HackathonQuestionSchema.parse(res.data);
  } catch (err) {
    console.warn(`Fallback hackathon question used for ${criterion.id}:`, err);
    return {
      criterionId: criterion.id,
      criterionTitle: criterion.title,
      weight: criterion.weight,
      question: criterion.defaultQuestion(repoName, filePaths),
      rubricPoints: criterion.defaultRubric,
      suggestedFileFocus: filePaths.slice(0, 2),
    };
  }
}

export function evaluateHackathonAnswerStrictly(
  question: HackathonQuestion,
  userAnswer: string,
  files: Record<string, string>,
  repoName: string
): HackathonGrade {
  const answer = userAnswer.trim();
  const lowerAnswer = answer.toLowerCase();
  const words = lowerAnswer.split(/\s+/).filter(Boolean);

  // 1. Extreme brevity / trivial answer check
  if (words.length < 6) {
    const score = Math.max(5, words.length * 2);
    const weightedScore = Math.round(((score * question.weight) / 100) * 10) / 10;
    return {
      score,
      weightedScore,
      verdict: 'weak',
      strengths: [],
      gaps: [
        'Response is far too brief to answer the judge inquiry.',
        'No problem analysis, solution logic, or project details were provided.',
      ],
      feedback: `The submitted defense was only ${words.length} word(s). A comprehensive project defense requires a clear, structured multi-sentence explanation.`,
      judgeTips: 'At the live judging table, never give one-line or evasive answers. Walk the judges through your problem and prototype.',
      followUpThought: `How does ${repoName} directly solve the problem for its end users?`,
    };
  }

  // 2. Admission of ignorance / non-answers / refusal
  const admissionPhrases = [
    "i don't know",
    "i dont know",
    "no idea",
    "not sure",
    "haven't done",
    "have not done",
    "not implemented",
    "didn't implement",
    "did not implement",
    "wrong answer",
    "fake",
    "random",
    "asdf",
  ];
  const hasAdmission = admissionPhrases.some((p) => lowerAnswer.includes(p));
  if (hasAdmission && words.length < 30) {
    const score = 15;
    const weightedScore = Math.round(((score * question.weight) / 100) * 10) / 10;
    return {
      score,
      weightedScore,
      verdict: 'weak',
      strengths: [],
      gaps: [
        'Response indicates missing implementation or lack of knowledge regarding this criterion.',
        'Judges were not provided with a functional rationale or proof of work.',
      ],
      feedback: `The defense indicates lack of familiarity or unverified implementation for "${question.criterionTitle}". Judges require concrete explanations of your work.`,
      judgeTips: 'Be honest about constraints, but pivot to how you would solve the challenge.',
      followUpThought: 'What is the immediate next step needed to make this feature production-ready?',
    };
  }

  // 3. Define criterion-specific evaluation rubrics & required concepts
  interface CriterionRubricDef {
    group1Name: string;
    group1Keywords: string[];
    group2Name: string;
    group2Keywords: string[];
    group3Name: string;
    group3Keywords: string[];
  }

  const rubricDefs: Record<string, CriterionRubricDef> = {
    problem_understanding: {
      group1Name: 'Root Cause vs Surface Symptoms',
      group1Keywords: ['root', 'cause', 'symptom', 'underlying', 'pain', 'core issue', 'friction', 'fundamental', 'origin', 'real problem', 'struggle', 'flaw'],
      group2Name: 'Target Audience & User Personas',
      group2Keywords: ['audience', 'user', 'developer', 'client', 'customer', 'team', 'who', 'persona', 'people', 'engineer', 'consumer', 'stakeholder', 'demographic'],
      group3Name: 'Urgency & Real-World Impact',
      group3Keywords: ['matter', 'urgent', 'critical', 'need', 'important', 'impact', 'cost', 'waste', 'risk', 'consequence', 'value', 'essential', 'why'],
    },
    solution_approach: {
      group1Name: 'Solution Logic & Effectiveness',
      group1Keywords: ['solution', 'solve', 'logic', 'approach', 'mechanism', 'effective', 'handle', 'process', 'step', 'pipeline', 'workflow', 'method', 'architecture'],
      group2Name: 'Alternatives Considered & Rationale',
      group2Keywords: ['alternative', 'considered', 'rather', 'instead', 'tradeoff', 'trade-off', 'option', 'evaluated', 'chose', 'choice', 'rationale', 'decision', 'comparison'],
      group3Name: 'Real-World Friction & Constraints',
      group3Keywords: ['real-world', 'challenge', 'constraint', 'friction', 'failure', 'edge case', 'scale', 'resilient', 'latency', 'limit', 'security', 'error', 'reliable'],
    },
    project_clarity: {
      group1Name: 'End-to-End Workflow & Pipeline',
      group1Keywords: ['workflow', 'step', 'first', 'then', 'next', 'finally', 'end-to-end', 'pipeline', 'journey', 'start', 'process', 'flow', 'sequence'],
      group2Name: 'Major Feature Purpose & Roles',
      group2Keywords: ['feature', 'component', 'purpose', 'module', 'dashboard', 'route', 'service', 'function', 'page', 'tool', 'role', 'capability'],
      group3Name: 'User Interaction & Experience',
      group3Keywords: ['interact', 'user', 'experience', 'click', 'input', 'screen', 'action', 'view', 'response', 'feedback', 'interface', 'ux', 'navigate'],
    },
    creativity_innovation: {
      group1Name: 'Novelty & Creative Problem Solving',
      group1Keywords: ['creative', 'innovative', 'novel', 'unique', 'original', 'novelty', 'new way', 'fresh', 'unconventional', 'breakthrough', 'inventive'],
      group2Name: 'Differentiation from Existing Solutions',
      group2Keywords: ['different', 'differentiate', 'existing', 'competitor', 'alternative', 'unlike', 'standard', 'traditional', 'current market', 'boilerplate', 'versus'],
      group3Name: 'Process Improvement or New Possibility',
      group3Keywords: ['improve', 'possibility', 'unlock', 'automate', 'transform', 'faster', 'better', 'new capability', 'opportunity', 'paradigm', 'advantage'],
    },
    feasibility_impact: {
      group1Name: 'Practical Real-World Adoption',
      group1Keywords: ['adopt', 'adoption', 'realistic', 'feasible', 'practical', 'deploy', 'production', 'implement', 'usable', 'viable', 'rollout'],
      group2Name: 'Tangible Real-World Impact',
      group2Keywords: ['impact', 'benefit', 'save', 'measur', 'meaningful', 'value', 'outcome', 'help', 'result', 'metric', 'efficiency'],
      group3Name: 'Future Scaling & Sustainability',
      group3Keywords: ['future', 'scale', 'scaling', 'sustainab', 'roadmap', 'growth', 'beyond', 'post-hackathon', 'next phase', 'long-term', 'evolution'],
    },
    technical_implementation: {
      group1Name: 'Working Prototype Execution',
      group1Keywords: ['prototype', 'working', 'functional', 'verified', 'tested', 'built', 'implemented', 'runs', 'live', 'demonstrat', 'actual', 'execution'],
      group2Name: 'Claimed Core Functionality Proof',
      group2Keywords: ['core', 'functionality', 'feature', 'flow', 'execution', 'pipeline', 'handling', 'endpoint', 'service', 'operation', 'proven', 'deliver'],
      group3Name: 'Operational Feasibility',
      group3Keywords: ['data', 'request', 'response', 'validat', 'state', 'handler', 'connect', 'reliab', 'codebase', 'system'],
    },
  };

  const def = rubricDefs[question.criterionId] || rubricDefs['problem_understanding'];

  // Check matching of each rubric group
  const matchesGroup1 = def.group1Keywords.some((kw) => lowerAnswer.includes(kw));
  const matchesGroup2 = def.group2Keywords.some((kw) => lowerAnswer.includes(kw));
  const matchesGroup3 = def.group3Keywords.some((kw) => lowerAnswer.includes(kw));

  const matchedCount = (matchesGroup1 ? 1 : 0) + (matchesGroup2 ? 1 : 0) + (matchesGroup3 ? 1 : 0);

  // Check overlap with question keywords (filter out common stopwords)
  const questionWords = question.question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !['about', 'which', 'their', 'there', 'project', 'would', 'could', 'should'].includes(w));
  const questionMatchCount = questionWords.filter((qw) => lowerAnswer.includes(qw)).length;

  // Check if answer mentions actual project context (e.g. repo name or file keywords)
  const repoWords = repoName.toLowerCase().split(/[/-_]/).filter((w) => w.length > 3);
  const mentionsRepoContext = repoWords.some((rw) => lowerAnswer.includes(rw));

  // Determine score strictly based on correctness and rubric coverage
  let score: number;
  let verdict: 'exceptional' | 'strong' | 'needs_work' | 'weak';
  const strengths: string[] = [];
  const gaps: string[] = [];

  // IF ZERO RUBRIC GROUPS MATCHED: Answer is wrong, off-topic, or evasive
  if (matchedCount === 0 && questionMatchCount === 0) {
    score = Math.min(20, 10 + Math.floor(words.length / 5));
    verdict = 'weak';
    gaps.push(`Answer did not address the required evaluation rubric points for ${question.criterionTitle}.`);
    gaps.push('The response is off-topic or fails to provide relevant reasoning for what was asked.');
  } else if (matchedCount === 0) {
    // Repeated question words but provided no actual rubric substance
    score = 25;
    verdict = 'weak';
    gaps.push(`Mentioned question keywords but failed to address ${def.group1Name} or ${def.group2Name}.`);
    gaps.push('Lacks concrete explanation of the team\'s approach and reasoning.');
  } else if (matchedCount === 1) {
    // Only touched 1 rubric point: Needs Work / Inadequate
    score = words.length > 40 ? 48 : 38;
    verdict = 'needs_work';
    if (matchesGroup1) strengths.push(`Addressed ${def.group1Name}`);
    if (matchesGroup2) strengths.push(`Addressed ${def.group2Name}`);
    if (matchesGroup3) strengths.push(`Addressed ${def.group3Name}`);

    if (!matchesGroup1) gaps.push(`Failed to address ${def.group1Name}.`);
    if (!matchesGroup2) gaps.push(`Failed to address ${def.group2Name}.`);
    if (!matchesGroup3) gaps.push(`Failed to address ${def.group3Name}.`);
  } else if (matchedCount === 2) {
    // Touched 2 rubric points: Fair to Competent
    score = words.length > 35 ? (mentionsRepoContext ? 72 : 65) : 58;
    verdict = score >= 70 ? 'strong' : 'needs_work';

    if (matchesGroup1) strengths.push(`Clearly articulated ${def.group1Name}`);
    if (matchesGroup2) strengths.push(`Addressed ${def.group2Name}`);
    if (matchesGroup3) strengths.push(`Articulated ${def.group3Name}`);

    if (!matchesGroup1) gaps.push(`Did not elaborate on ${def.group1Name}.`);
    if (!matchesGroup2) gaps.push(`Did not provide explanation of ${def.group2Name}.`);
    if (!matchesGroup3) gaps.push(`Did not address ${def.group3Name}.`);
  } else {
    // Touched all 3 rubric points: Strong to Exceptional
    score = words.length >= 25 ? (mentionsRepoContext ? 90 : 85) : 78;
    verdict = score >= 85 ? 'exceptional' : 'strong';

    strengths.push(`Clearly articulated ${def.group1Name}`);
    strengths.push(`Addressed ${def.group2Name} with sound reasoning`);
    strengths.push(`Articulated ${def.group3Name}`);

    if (score < 85) {
      gaps.push('Could provide even more concrete metrics or architectural proof.');
    } else {
      gaps.push('Prepare for edge-case deep dives during live demo question-and-answer.');
    }
  }

  const weightedScore = Math.round(((score * question.weight) / 100) * 10) / 10;

  let feedback: string;
  if (verdict === 'weak') {
    feedback = `The defense did not properly answer the judge inquiry for "${question.criterionTitle}". Low points were assigned due to missing core rubric elements and lack of problem understanding.`;
  } else if (verdict === 'needs_work') {
    feedback = `The defense partially addressed "${question.criterionTitle}", but left notable gaps in ${gaps.map((g) => g.replace('Failed to address ', '').replace('Did not elaborate on ', '').replace('.', '')).join(' and ')}. Points were awarded proportionally.`;
  } else if (verdict === 'strong') {
    feedback = `The team delivered a solid, competent defense for "${question.criterionTitle}". Most essential rubric criteria were addressed with clear reasoning.`;
  } else {
    feedback = `Outstanding defense for "${question.criterionTitle}". The team demonstrated deep understanding, sound problem-solving, and clear articulation across all judging criteria.`;
  }

  return {
    score,
    weightedScore,
    verdict,
    strengths: strengths.length > 0 ? strengths : ['Communicated in plain conversational terms'],
    gaps,
    feedback,
    judgeTips:
      verdict === 'weak' || verdict === 'needs_work'
        ? `Focus directly on ${def.group1Name} and ${def.group2Name} to persuade judges.`
        : `Lead with your live demonstration first, then back it up with this structured rationale.`,
    followUpThought: `How will your team defend this under time pressure at the final demo table?`,
  };
}

export async function evaluateHackathonAnswer(
  question: HackathonQuestion,
  userAnswer: string,
  files: Record<string, string>,
  repoName: string,
  options?: { openaiClient?: OpenAI }
): Promise<HackathonGrade> {
  const prompt = `You are a rigorous, highly discerning Hackathon Head Judge evaluating a team's project defense.

PROJECT: "${repoName}"
EVALUATION CRITERION: "${question.criterionTitle}" (${question.weight}% Weight)
JUDGE INQUIRY:
"${question.question}"

EVALUATION RUBRIC POINTS:
${question.rubricPoints.map((r) => `- ${r}`).join('\n')}

STUDENT / TEAM DEFENSE ANSWER:
"${userAnswer}"

STRICT EVALUATION MANDATE:
The evaluation MUST be rigorous and strictly calibrated to how well and how correctly the student's answer addresses the specific judge inquiry above.
- If the answer is WRONG, OFF-TOPIC, TRIVIAL, EVASIVE, CONTRADICTORY, OR NONSENSICAL:
  -> AWARD LOW POINTS (0 to 35 out of 100). Do NOT award high points just for length, polite filler, or superficial buzzwords.
- If the answer is PARTIALLY CORRECT or addresses only a small fraction with significant gaps:
  -> AWARD MODERATE POINTS (40 to 65 out of 100).
- If the answer is ACCURATE, LOGICAL, and directly addresses the inquiry and rubric points:
  -> AWARD SOLID OR HIGH POINTS (70 to 100 out of 100 based on thoroughness and truthfulness).

SCORING TIERS:
- 0 to 29 (Weak / Incorrect): Completely wrong, irrelevant to the question, contradicting facts, or non-responsive.
- 30 to 49 (Needs Work / Inadequate): Vague, superficial, mostly incorrect, or missing the core of what was asked.
- 50 to 69 (Fair / Partial): Partially addresses the inquiry with some correct points, but has notable omissions or flaws.
- 70 to 84 (Strong / Competent): Clear, accurate response directly addressing the question with sound reasoning.
- 85 to 100 (Exceptional / Mastery): Highly compelling, accurate, deeply reasoned defense covering all rubric points.

CALCULATIONS:
- "score": Integer from 0 to 100 based strictly on answer correctness.
- "weightedScore": Rounded to 1 decimal place: (score * ${question.weight}) / 100.
- "verdict": "exceptional" (>=85), "strong" (70-84), "needs_work" (45-69), "weak" (<45).
- "strengths": Specific things the team actually explained correctly (or ["None identified in this response"] if wrong).
- "gaps": Clear, actionable explanation of what was wrong, missing, or inaccurate in their answer.
- "feedback": Honest, direct judge critique. If wrong, explicitly state why it is incorrect and what was expected.
- "judgeTips": Specific guidance on how to fix this response for live judging.
- "followUpThought": A targeted question challenging their weak points.

Respond with valid JSON only in this exact schema without extra keys or markdown prose:
{
  "score": 0,
  "weightedScore": 0.0,
  "verdict": "weak",
  "strengths": ["..."],
  "gaps": ["..."],
  "feedback": "...",
  "judgeTips": "...",
  "followUpThought": "..."
}`;

  try {
    const res = await askLLM<HackathonGrade>(prompt, {
      openaiClient: options?.openaiClient,
      systemMessage: 'You are an exacting hackathon judge. Grade strictly according to correctness. If wrong give low points. Respond with valid JSON only.',
    });
    return HackathonGradeSchema.parse(res.data);
  } catch (err) {
    console.warn('Using strict local hackathon defense evaluation engine:', err);
    return evaluateHackathonAnswerStrictly(question, userAnswer, files, repoName);
  }
}
