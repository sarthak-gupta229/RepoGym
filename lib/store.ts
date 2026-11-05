import { DependencyGraph, buildGraph } from './graph';
import { Flow, detectFlows } from './select';
import { ExpectedFact, Citation } from './schemas';
import loginFixture from '@/tests/fixtures/login.json';

export interface User {
  id: string;
  email: string;
  name?: string;
  github_username?: string;
  created_at: string;
}

export interface Repo {
  id: string;
  owner: string;
  name: string;
  default_branch: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  repo_id: string;
  commit_sha: string;
  file_map: Record<string, string>;
  graph: DependencyGraph;
  flows: Flow[];
  truncated: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  analysis_id: string;
  flow_tag: string;
  status: 'in_progress' | 'completed' | 'paused';
  total_questions: number;
  current_index: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  session_id: string;
  analysis_id: string;
  flow_tag: string;
  position: number;
  question: string;
  expected_facts: ExpectedFact[];
  created_at: string;
}

export interface Attempt {
  id: string;
  question_id: string;
  user_id: string;
  answer: string;
  score: number;
  max_score: number;
  verdict: 'correct' | 'partial' | 'incorrect';
  covered: string[];
  missed: string[];
  feedback: string;
  citations: Citation[];
  follow_up_question: string | null;
  created_at: string;
}

export interface FeedbackFlag {
  id: string;
  attempt_id: string;
  user_id: string;
  helpful: boolean;
  note?: string;
  created_at: string;
}

class InMemoryStore {
  users = new Map<string, User>();
  userCredentials = new Map<string, { passwordHash: string; salt: string }>();
  repos = new Map<string, Repo>();
  analyses = new Map<string, Analysis>();
  sessions = new Map<string, Session>();
  questions = new Map<string, Question>();
  attempts = new Map<string, Attempt>();
  feedback = new Map<string, FeedbackFlag>();

  constructor() {
    this.initDemoData();
  }

  private initDemoData() {
    const demoRepo: Repo = {
      id: 'repo-demo',
      owner: 'demo',
      name: 'login-service',
      default_branch: 'main',
      created_at: new Date().toISOString(),
    };
    this.repos.set(demoRepo.id, demoRepo);

    const demoGraph = buildGraph(loginFixture);
    const demoFlows = detectFlows(loginFixture);

    const demoAnalysis: Analysis = {
      id: 'demo',
      repo_id: demoRepo.id,
      commit_sha: 'commit-demo-12345',
      file_map: loginFixture,
      graph: demoGraph,
      flows: demoFlows,
      truncated: false,
      created_at: new Date().toISOString(),
    };
    this.analyses.set(demoAnalysis.id, demoAnalysis);

    const defaultUser: User = {
      id: 'demo-user-1',
      email: 'demo@repogym.dev',
      name: 'Demo Student',
      created_at: new Date().toISOString(),
    };
    this.users.set(defaultUser.id, defaultUser);
    this.userCredentials.set(defaultUser.id, {
      salt: 'repogym_demo_salt_2026',
      passwordHash: '49b3239f5a9b859351e867098074f0028b2f563a7f6e6e1b5f3b3bdd951e4dfb',
    });
  }

  // Users
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase().trim() === normalized) {
        return u;
      }
    }
    return null;
  }

  async createUser(data: {
    email: string;
    name?: string;
    passwordHash?: string;
    salt?: string;
  }): Promise<User> {
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user: User = {
      id,
      email: data.email.toLowerCase().trim(),
      name: data.name,
      created_at: new Date().toISOString(),
    };
    this.users.set(id, user);
    if (data.passwordHash && data.salt) {
      this.userCredentials.set(id, {
        passwordHash: data.passwordHash,
        salt: data.salt,
      });
    }
    return user;
  }

  async getUserCredentials(
    userId: string
  ): Promise<{ passwordHash: string; salt: string } | null> {
    return this.userCredentials.get(userId) || null;
  }

  async updateUserPassword(
    userId: string,
    passwordHash: string,
    salt: string
  ): Promise<void> {
    this.userCredentials.set(userId, { passwordHash, salt });
  }

  // Repos
  async getRepo(id: string): Promise<Repo | null> {
    return this.repos.get(id) || null;
  }

  async getRepoByOwnerName(owner: string, name: string): Promise<Repo | null> {
    for (const repo of this.repos.values()) {
      if (repo.owner.toLowerCase() === owner.toLowerCase() && repo.name.toLowerCase() === name.toLowerCase()) {
        return repo;
      }
    }
    return null;
  }

  async saveRepo(repo: Omit<Repo, 'id' | 'created_at'>): Promise<Repo> {
    const existing = await this.getRepoByOwnerName(repo.owner, repo.name);
    if (existing) {
      existing.default_branch = repo.default_branch;
      return existing;
    }
    const id = `repo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newRepo: Repo = {
      ...repo,
      id,
      created_at: new Date().toISOString(),
    };
    this.repos.set(id, newRepo);
    return newRepo;
  }

  // Analyses
  async getAnalysis(id: string): Promise<Analysis | null> {
    return this.analyses.get(id) || null;
  }

  async findAnalysis(repoId: string, commitSha: string): Promise<Analysis | null> {
    for (const a of this.analyses.values()) {
      if (a.repo_id === repoId && a.commit_sha === commitSha) {
        return a;
      }
    }
    return null;
  }

  async saveAnalysis(data: Omit<Analysis, 'id' | 'created_at'>): Promise<Analysis> {
    const existing = await this.findAnalysis(data.repo_id, data.commit_sha);
    if (existing) return existing;

    const id = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newAnalysis: Analysis = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.analyses.set(id, newAnalysis);
    return newAnalysis;
  }

  // Sessions
  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter((s) => s.user_id === userId);
  }

  async createSession(
    userId: string,
    analysisId: string,
    flowTag: string,
    totalQuestions = 3
  ): Promise<Session> {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const session: Session = {
      id,
      user_id: userId,
      analysis_id: analysisId,
      flow_tag: flowTag,
      status: 'in_progress',
      total_questions: totalQuestions,
      current_index: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    const updated: Session = {
      ...session,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  // Questions
  async createQuestion(data: Omit<Question, 'id' | 'created_at'>): Promise<Question> {
    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const question: Question = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.questions.set(id, question);
    return question;
  }

  async getQuestion(id: string): Promise<Question | null> {
    return this.questions.get(id) || null;
  }

  async getQuestionsForSession(sessionId: string): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter((q) => q.session_id === sessionId)
      .sort((a, b) => a.position - b.position);
  }

  // Attempts
  async createAttempt(data: Omit<Attempt, 'id' | 'created_at'>): Promise<Attempt> {
    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const attempt: Attempt = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.attempts.set(id, attempt);
    return attempt;
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    return this.attempts.get(id) || null;
  }

  async getAttemptsForSession(sessionId: string): Promise<Attempt[]> {
    const questionIds = new Set(
      (await this.getQuestionsForSession(sessionId)).map((q) => q.id)
    );
    return Array.from(this.attempts.values()).filter((a) =>
      questionIds.has(a.question_id)
    );
  }

  async getAttemptsForQuestion(questionId: string): Promise<Attempt[]> {
    return Array.from(this.attempts.values()).filter(
      (a) => a.question_id === questionId
    );
  }

  // Feedback
  async createFeedback(data: Omit<FeedbackFlag, 'id' | 'created_at'>): Promise<FeedbackFlag> {
    const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const flag: FeedbackFlag = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.feedback.set(id, flag);
    return flag;
  }

  async getFeedbackForAttempt(attemptId: string): Promise<FeedbackFlag | null> {
    for (const fb of this.feedback.values()) {
      if (fb.attempt_id === attemptId) return fb;
    }
    return null;
  }
}

const globalForStore = globalThis as unknown as { store: InMemoryStore };
export const store = globalForStore.store || new InMemoryStore();
globalForStore.store = store;

