import fs from 'node:fs';
import path from 'node:path';
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

export interface UserRepo {
  id: string;
  user_id: string;
  repo_id: string;
  last_visited_at: string;
  created_at: string;
}

export interface VisitedRepoItem extends Repo {
  last_visited_at: string;
  sessionsCount: number;
  latestSession?: {
    id: string;
    status: 'in_progress' | 'completed' | 'paused';
    current_index: number;
    total_questions: number;
    created_at: string;
  } | null;
  latestCommitSha?: string | null;
  analysisId?: string | null;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'repogym-db.json');

class PersistentStore {
  users = new Map<string, User>();
  userCredentials = new Map<string, { passwordHash: string; salt: string }>();
  repos = new Map<string, Repo>();
  analyses = new Map<string, Analysis>();
  sessions = new Map<string, Session>();
  questions = new Map<string, Question>();
  attempts = new Map<string, Attempt>();
  feedback = new Map<string, FeedbackFlag>();
  userRepos = new Map<string, UserRepo>();

  constructor() {
    this.loadFromDisk();
  }

  private ensureDemoData() {
    if (!this.repos.has('repo-demo')) {
      const demoRepo: Repo = {
        id: 'repo-demo',
        owner: 'demo',
        name: 'login-service',
        default_branch: 'main',
        created_at: new Date().toISOString(),
      };
      this.repos.set(demoRepo.id, demoRepo);
    }

    if (!this.analyses.has('demo')) {
      const demoGraph = buildGraph(loginFixture);
      const demoFlows = detectFlows(loginFixture);

      const demoAnalysis: Analysis = {
        id: 'demo',
        repo_id: 'repo-demo',
        commit_sha: 'commit-demo-12345',
        file_map: loginFixture,
        graph: demoGraph,
        flows: demoFlows,
        truncated: false,
        created_at: new Date().toISOString(),
      };
      this.analyses.set(demoAnalysis.id, demoAnalysis);
    }

    if (!this.users.has('demo-user-1')) {
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

    // Ensure demo user has a visit record for demo repo
    const demoVisit = Array.from(this.userRepos.values()).find(
      (ur) => ur.user_id === 'demo-user-1' && ur.repo_id === 'repo-demo'
    );
    if (!demoVisit) {
      const ur: UserRepo = {
        id: 'ur-demo-default',
        user_id: 'demo-user-1',
        repo_id: 'repo-demo',
        last_visited_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      this.userRepos.set(ur.id, ur);
    }
  }

  private loadFromDisk() {
    if (typeof window !== 'undefined') return;
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.ensureDemoData();
        this.saveToDisk();
        return;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      if (!raw.trim()) {
        this.ensureDemoData();
        return;
      }
      const data = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        for (const u of data.users) this.users.set(u.id, u);
      }
      if (Array.isArray(data.userCredentials)) {
        for (const [id, cred] of data.userCredentials) this.userCredentials.set(id, cred);
      }
      if (Array.isArray(data.repos)) {
        for (const r of data.repos) this.repos.set(r.id, r);
      }
      if (Array.isArray(data.analyses)) {
        for (const a of data.analyses) this.analyses.set(a.id, a);
      }
      if (Array.isArray(data.sessions)) {
        for (const s of data.sessions) this.sessions.set(s.id, s);
      }
      if (Array.isArray(data.questions)) {
        for (const q of data.questions) this.questions.set(q.id, q);
      }
      if (Array.isArray(data.attempts)) {
        for (const att of data.attempts) this.attempts.set(att.id, att);
      }
      if (Array.isArray(data.feedback)) {
        for (const f of data.feedback) this.feedback.set(f.id, f);
      }
      if (Array.isArray(data.userRepos)) {
        for (const ur of data.userRepos) this.userRepos.set(ur.id, ur);
      }

      this.ensureDemoData();
    } catch (err) {
      console.warn('Failed to load database from disk, fallback to in-memory defaults:', err);
      this.ensureDemoData();
    }
  }

  private saveToDisk() {
    if (typeof window !== 'undefined') return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serialized = JSON.stringify({
        users: Array.from(this.users.values()),
        userCredentials: Array.from(this.userCredentials.entries()),
        repos: Array.from(this.repos.values()),
        analyses: Array.from(this.analyses.values()),
        sessions: Array.from(this.sessions.values()),
        questions: Array.from(this.questions.values()),
        attempts: Array.from(this.attempts.values()),
        feedback: Array.from(this.feedback.values()),
        userRepos: Array.from(this.userRepos.values()),
      });
      const tmpFile = `${DB_FILE}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
      fs.writeFileSync(tmpFile, serialized, 'utf8');
      try {
        fs.renameSync(tmpFile, DB_FILE);
      } catch {
        // Fallback in case of parallel rename race
        fs.writeFileSync(DB_FILE, serialized, 'utf8');
        try {
          fs.unlinkSync(tmpFile);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Failed to persist database to disk:', err);
    }
  }

  private async syncToSupabase(table: string, payload: Record<string, unknown>) {
    if (typeof window !== 'undefined') return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    try {
      const { createServiceClient } = await import('./supabase/service');
      const supabase = createServiceClient();
      await supabase.from(table).upsert(payload as never);
    } catch {
      // Gracefully ignore Supabase error (e.g. table not created yet or network offline)
    }
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
    this.saveToDisk();
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
    this.saveToDisk();
  }

  // Repos
  async getRepo(id: string): Promise<Repo | null> {
    return this.repos.get(id) || null;
  }

  async getRepoByOwnerName(owner: string, name: string): Promise<Repo | null> {
    const o = owner.toLowerCase().trim();
    const n = name.toLowerCase().trim();
    for (const repo of this.repos.values()) {
      if (repo.owner.toLowerCase().trim() === o && repo.name.toLowerCase().trim() === n) {
        return repo;
      }
    }
    return null;
  }

  async saveRepo(repo: Omit<Repo, 'id' | 'created_at'>, userId?: string): Promise<Repo> {
    const existing = await this.getRepoByOwnerName(repo.owner, repo.name);
    if (existing) {
      existing.default_branch = repo.default_branch;
      this.saveToDisk();
      if (userId) {
        await this.recordUserRepoVisit(userId, existing.id);
      }
      this.syncToSupabase('repos', {
        id: existing.id,
        owner: existing.owner,
        name: existing.name,
        default_branch: existing.default_branch,
        created_at: existing.created_at,
      });
      return existing;
    }

    const id = `repo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newRepo: Repo = {
      ...repo,
      id,
      created_at: new Date().toISOString(),
    };
    this.repos.set(id, newRepo);
    this.saveToDisk();
    if (userId) {
      await this.recordUserRepoVisit(userId, newRepo.id);
    }
    this.syncToSupabase('repos', {
      id: newRepo.id,
      owner: newRepo.owner,
      name: newRepo.name,
      default_branch: newRepo.default_branch,
      created_at: newRepo.created_at,
    });
    return newRepo;
  }

  // User Repo Visits Tracking
  async recordUserRepoVisit(userId: string, repoId: string): Promise<UserRepo> {
    const existingVisit = Array.from(this.userRepos.values()).find(
      (ur) => ur.user_id === userId && ur.repo_id === repoId
    );
    const now = new Date().toISOString();
    if (existingVisit) {
      existingVisit.last_visited_at = now;
      this.saveToDisk();
      this.syncToSupabase('user_repos', {
        id: existingVisit.id,
        user_id: existingVisit.user_id,
        repo_id: existingVisit.repo_id,
        last_visited_at: now,
      });
      return existingVisit;
    }

    const id = `ur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userRepo: UserRepo = {
      id,
      user_id: userId,
      repo_id: repoId,
      last_visited_at: now,
      created_at: now,
    };
    this.userRepos.set(id, userRepo);
    this.saveToDisk();
    this.syncToSupabase('user_repos', {
      id: userRepo.id,
      user_id: userRepo.user_id,
      repo_id: userRepo.repo_id,
      last_visited_at: userRepo.last_visited_at,
      created_at: userRepo.created_at,
    });
    return userRepo;
  }

  async getUserRepos(userId: string): Promise<VisitedRepoItem[]> {
    // Collect visited repo IDs for this user
    const userVisits = Array.from(this.userRepos.values()).filter((ur) => ur.user_id === userId);
    const repoVisitMap = new Map<string, string>(); // repo_id -> last_visited_at
    for (const v of userVisits) {
      repoVisitMap.set(v.repo_id, v.last_visited_at);
    }

    // Also include repos that user has sessions in
    const userSessions = Array.from(this.sessions.values()).filter((s) => s.user_id === userId);
    for (const s of userSessions) {
      const analysis = this.analyses.get(s.analysis_id);
      if (analysis && !repoVisitMap.has(analysis.repo_id)) {
        repoVisitMap.set(analysis.repo_id, s.updated_at || s.created_at);
      }
    }

    // Fallback: If no visited repos recorded yet for this user, include all available repos
    if (repoVisitMap.size === 0) {
      for (const r of this.repos.values()) {
        repoVisitMap.set(r.id, r.created_at);
      }
    }

    const result: VisitedRepoItem[] = [];

    for (const [repoId, lastVisitedAt] of repoVisitMap.entries()) {
      const repo = this.repos.get(repoId);
      if (!repo) continue;

      // Filter sessions belonging to this user for this repo
      const repoSessions = userSessions
        .filter((s) => {
          const a = this.analyses.get(s.analysis_id);
          return a?.repo_id === repo.id;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Latest analysis for this repo
      const repoAnalyses = Array.from(this.analyses.values())
        .filter((a) => a.repo_id === repo.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latestAnalysis = repoAnalyses[0] || null;
      const latestSession = repoSessions[0] || null;

      result.push({
        ...repo,
        last_visited_at: lastVisitedAt,
        sessionsCount: repoSessions.length,
        latestSession: latestSession
          ? {
              id: latestSession.id,
              status: latestSession.status,
              current_index: latestSession.current_index,
              total_questions: latestSession.total_questions,
              created_at: latestSession.created_at,
            }
          : null,
        latestCommitSha: latestAnalysis?.commit_sha || null,
        analysisId: latestAnalysis?.id || (repo.id === 'repo-demo' ? 'demo' : null),
      });
    }

    // Sort descending by last_visited_at
    result.sort(
      (a, b) => new Date(b.last_visited_at).getTime() - new Date(a.last_visited_at).getTime()
    );

    return result;
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
    this.saveToDisk();
    this.syncToSupabase('analyses', {
      id: newAnalysis.id,
      repo_id: newAnalysis.repo_id,
      commit_sha: newAnalysis.commit_sha,
      file_map: newAnalysis.file_map,
      graph: newAnalysis.graph,
      flows: newAnalysis.flows,
      truncated: newAnalysis.truncated,
      created_at: newAnalysis.created_at,
    });
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
    this.saveToDisk();

    // Also record user repo visit if analysis exists
    const analysis = this.analyses.get(analysisId);
    if (analysis) {
      await this.recordUserRepoVisit(userId, analysis.repo_id);
    }

    this.syncToSupabase('sessions', {
      id: session.id,
      user_id: session.user_id,
      analysis_id: session.analysis_id,
      flow_tag: session.flow_tag,
      status: session.status,
      total_questions: session.total_questions,
      current_index: session.current_index,
      created_at: session.created_at,
      updated_at: session.updated_at,
    });
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
    this.saveToDisk();
    this.syncToSupabase('sessions', {
      id: updated.id,
      user_id: updated.user_id,
      analysis_id: updated.analysis_id,
      flow_tag: updated.flow_tag,
      status: updated.status,
      total_questions: updated.total_questions,
      current_index: updated.current_index,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    });
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
    this.saveToDisk();
    this.syncToSupabase('questions', {
      id: question.id,
      session_id: question.session_id,
      analysis_id: question.analysis_id,
      flow_tag: question.flow_tag,
      position: question.position,
      question: question.question,
      expected_facts: question.expected_facts,
      created_at: question.created_at,
    });
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
    this.saveToDisk();
    this.syncToSupabase('attempts', {
      id: attempt.id,
      question_id: attempt.question_id,
      user_id: attempt.user_id,
      answer: attempt.answer,
      score: attempt.score,
      max_score: attempt.max_score,
      verdict: attempt.verdict,
      covered: attempt.covered,
      missed: attempt.missed,
      feedback: attempt.feedback,
      citations: attempt.citations,
      follow_up_question: attempt.follow_up_question,
      created_at: attempt.created_at,
    });
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
    this.saveToDisk();
    this.syncToSupabase('feedback_flags', {
      id: flag.id,
      attempt_id: flag.attempt_id,
      user_id: flag.user_id,
      helpful: flag.helpful,
      note: flag.note,
      created_at: flag.created_at,
    });
    return flag;
  }

  async getFeedbackForAttempt(attemptId: string): Promise<FeedbackFlag | null> {
    for (const fb of this.feedback.values()) {
      if (fb.attempt_id === attemptId) return fb;
    }
    return null;
  }
}

const globalForStore = globalThis as unknown as { store: PersistentStore };
export const store = globalForStore.store || new PersistentStore();
globalForStore.store = store;
