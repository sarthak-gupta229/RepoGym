# RepoGym: Implementation Plan for the Coding Agent

## 0. How to work

- Read `PRD.md` before writing code. It is the source of truth for features, data, and API endpoints. If this plan and the PRD disagree, stop and ask.
- Build one phase at a time, in order. Don't start a phase until the previous phase's **Definition of Done** passes.
- Don't add libraries outside the stack in Section 2 without asking first.
- Don't change the database schema or endpoint names without asking. Both are defined in the PRD.
- Never put `OPENROUTER_API_KEY`, `GITHUB_TOKEN`, or `SUPABASE_SERVICE_ROLE_KEY` in any file that runs in the browser, and never commit `.env.local`.
- After each phase, report: files created or changed, tests run, and anything left open.

## 1. Starting point

Run these once, in an empty folder named `repogym`:

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"
git init && git add . && git commit -m "chore: scaffold Next.js app"
npm install openai @supabase/supabase-js @supabase/ssr zod @xyflow/react @dagrejs/dagre
npm install -D vitest
```

Create `.env.local` with the five variables from PRD Section 12 (empty values are fine until the phase needs them). Confirm `.gitignore` contains `.env*.local`.

## 2. Stack (do not deviate)

| Concern           | Use                                                                         |
| ----------------- | --------------------------------------------------------------------------- |
| Framework         | Next.js App Router, TypeScript, API routes                                  |
| UI                | Tailwind, React Flow (`@xyflow/react`), dagre                               |
| Validation        | Zod                                                                         |
| GitHub            | REST API and `raw.githubusercontent.com`                                    |
| AI                | OpenRouter via `openai` SDK, model `nvidia/nemotron-3-ultra-550b-a55b:free` |
| Database and auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`)                         |
| Tests             | Vitest                                                                      |

## 3. Folder layout

Create these files in this order. Keep pure logic in `lib/` so it can be tested without a server.

```
app/
  page.tsx                          home: URL input
  repos/[id]/page.tsx               repo page: graph, sessions
  sessions/[id]/page.tsx            session view: question, answer, grade
  dashboard/page.tsx                my repositories + performance
  auth/callback/route.ts            Supabase auth callback
  api/
    repos/route.ts                  POST analyze, GET list
    repos/[id]/route.ts             GET repo details
    repos/[id]/reanalyze/route.ts   POST
    analyses/[id]/files/[...path]/route.ts
    sessions/route.ts               POST start
    sessions/[id]/route.ts          GET state
    sessions/[id]/next/route.ts     POST next question
    questions/[id]/answers/route.ts POST submit answer
    attempts/[id]/feedback/route.ts POST
    dashboard/route.ts              GET
components/
  DependencyGraph.tsx
  FileViewer.tsx
  QuestionPanel.tsx
  GradeCard.tsx
lib/
  github.ts        fetch tree and file contents
  select.ts        flow selection and import-based file picking
  graph.ts         build nodes and edges from file map
  layout.ts        dagre layout
  prompt.ts        numbered code blocks and prompt templates
  llm.ts           OpenRouter client with JSON extraction and retry
  schemas.ts       Zod schemas for challenge and grade
  validate.ts      citation and fact-ID checks
  limits.ts        file caps and daily session limit
  supabase/client.ts
  supabase/server.ts
  supabase/service.ts   service-role client (server only)
supabase/
  migrations/0001_schema.sql
  migrations/0002_rls.sql
tests/
  fixtures/        sample repos as JSON file maps
```

## 4. Phases

### Phase 1: Repository ingestion (no AI, no database)

**Build**

- `lib/github.ts`: `parseRepoUrl(url)` accepts `github.com/owner/repo` with or without `https://`, `.git`, or trailing path. Throws a typed error on bad input.
- `fetchRepoFiles(owner, repo)`: calls the four GitHub steps in PRD Section 10 in order. Returns `{ commitSha, defaultBranch, truncated, files }`.
- Apply the filters from PRD F2: extensions, excluded paths, lockfiles, 20 KB per file, 150 files total.
- Download contents in batches of 10. Read `X-RateLimit-Remaining` and throw a rate-limit error with the reset time.
- Map GitHub errors: 404 or 403 becomes "private or missing"; zero code files becomes "no supported files."

**Test** (`tests/github.test.ts`): mock `fetch` and cover the filters, the 150-file cap, truncation, and each error path.

**Definition of Done**

- `npx vitest run` passes.
- A manual script run on a public repo returns a file map with a sensible file count.

### Phase 2: Dependency graph data and UI

**Build**

- `lib/graph.ts`: `buildGraph(files)` returns `{ nodes, edges }`. Nodes hold `id`, `file`, `exports`. Edges hold `source` and `target` for resolved relative imports only. Export detection follows PRD F3 (ES modules and CommonJS).
- `lib/layout.ts`: `layout(nodes, edges)` returns nodes with `position` using dagre, `rankdir: "LR"`.
- `components/DependencyGraph.tsx`: a client component (`"use client"`) using React Flow. Props: `graph`, `highlight` (file paths), `onSelect`. Include zoom, pan, fit-view, minimap, and the highlight style.
- `components/FileViewer.tsx`: shows a file with line numbers.
- `app/repos/[id]/page.tsx` shows the graph and the viewer. For now, load a fixture from `tests/fixtures/`.

**Test**: `buildGraph` on the login fixture (Section 6) produces the expected edges and exports.

**Definition of Done**

- The graph renders on `/repos/demo` with the fixture.
- Clicking a node opens its code.
- A highlight prop turns the matching nodes yellow.

### Phase 3: Flow detection, prompts, and the AI call

**Build**

- `lib/select.ts`:
  - `detectFlows(files)` finds route files (Express `app.get`/`router.post`, `app/api/**/route.*`, `pages/api/**`, FastAPI decorators) and returns `{ id, label, routeFile, tag }` for each.
  - `selectFlowFiles(files, flow)` returns the route file plus its direct relative imports, and two more hops if the route file is short on context.
- `lib/prompt.ts`:
  - `numberLines(content)` adds `N: ` prefixes.
  - `buildPrompt(files, task)` wraps each file in `<file path="...">` blocks, as in the prompt example in PRD Section 9 and the Section 6 fixture.
  - Keep the prompt under 30,000 tokens. Estimate as `chars / 4`. Drop the least relevant file first.
- `lib/llm.ts`:
  - `askLLM(prompt)` uses the OpenAI SDK with `baseURL: "https://openrouter.ai/api/v1"`.
  - Send a system message: "Respond with valid JSON only."
  - Extract the first `{` to the last `}` before parsing.
  - Timeout 30 seconds, one retry on invalid JSON or timeout.
  - Read the model name from one constant. Add a fallback model constant but don't wire it yet.
- `lib/schemas.ts`: Zod schemas for `Challenge` (question, `expectedFacts[]` with `id`, `fact`, `file`, `startLine`, `endLine`) and `Grade` (per PRD F6).
- `lib/validate.ts`:
  - Every cited file must exist in the file map.
  - Every line range must fall within the file's length.
  - Every fact ID in `covered` or `missed` must exist in `expectedFacts`.
  - Return a list of problems. An empty list means valid.

**Test**: `buildPrompt` output on the fixture matches a saved snapshot. `validate` rejects a fake file and an out-of-range line. `extractJSON` handles text before and after the JSON. Mock the LLM in unit tests.

**Definition of Done**

- A local script generates one challenge from the fixture using the real OpenRouter key.
- The challenge passes `validate` with zero problems.
- If validation fails, the code retries once, then returns a clear error.

### Phase 4: Sessions, questions, and grading (in memory first)

**Build**

- Implement the endpoints in PRD Section 9, reading and writing an in-memory store (`lib/store.ts`) for now. Keep the same function signatures you will use with Supabase in Phase 5.
- `POST /api/sessions`: picks a flow, generates question 1.
- `POST /api/sessions/[id]/next`: generates the next question. The prompt includes past results (flow, verdict, missed IDs) and must not repeat a flow.
- `POST /api/questions/[id]/answers`: rejects answers over 2,000 characters, calls the grading prompt, validates with `Grade` and `validate.ts`, returns the grade and follow-up.
- Session length is 3 questions. After question 3 is graded, set status to `completed`.

**Test**: a full three-question session on the fixture, using a mocked LLM, runs to completion.

**Definition of Done**

- The UI in `sessions/[id]` shows question, answer box, grade with citations, and "Next question."
- Citations highlight the matching files on the graph.
- A grading failure keeps the student's answer and shows a retry button.

### Phase 5: Supabase persistence and accounts

**Build**

- `supabase/migrations/0001_schema.sql`: the tables from the Supabase setup guide, exactly as written there.
- `supabase/migrations/0002_rls.sql`: the RLS policies from the setup guide.
- `lib/supabase/server.ts`: the server client from the setup guide (cookie-based, respects RLS).
- `lib/supabase/service.ts`: the service-role client, used only inside API routes for writing shared `analyses` rows. Never import it in a file with `"use client"`.
- `middleware.ts`: refresh the Supabase session cookie on each request, following the `@supabase/ssr` Next.js pattern.
- `app/auth/callback/route.ts`: exchange the code for a session.
- Sign-in page with email and GitHub buttons.
- Replace the in-memory store with Supabase. Keep the function signatures from Phase 4.
- Caching: before calling GitHub, check `analyses` for `(repo_id, commit_sha)`. Reuse the stored `file_map` and `graph` if found. Cache challenges by `(analysis_id, flow_tag)` (PRD F11).

**Test**: a test that signs in as two users and confirms user B cannot read user A's session by ID.

**Definition of Done**

- Sign in works locally.
- A repo analyzed once is returned from the database on the second request, with no GitHub calls (check the logs).
- The RLS test passes.

### Phase 6: Dashboard, feedback, and limits

**Build**

- `app/dashboard/page.tsx`: "My repositories" (PRD F9), with progress, Resume, Start new session, and the "Repo updated" badge.
- Session summary page: score, covered and missed topics, and "Review missed topics."
- `GET /api/dashboard`: score trend and misses grouped by `flow_tag`.
- `POST /api/attempts/[id]/feedback`: thumbs up or down with optional note.
- `lib/limits.ts`: maximum 20 new sessions per user per day. Return HTTP 429 with a friendly message.
- Re-analyze: `POST /api/repos/[id]/reanalyze` creates a new `analyses` row if the latest commit SHA differs.

**Definition of Done**

- Dashboard shows real data from the database.
- Thumbs down saves a feedback row.
- The 21st session of the day is blocked with a clear message.

### Phase 7: Hardening and demo prep

- Add the error table from PRD Section 13 to the UI. Every error case shows the message from that table.
- Add analytics events from PRD Section 14 as structured logs (no file contents or answers).
- Add `NEXT_PUBLIC_APP_URL` for absolute links.
- Run a full session on three real public repos, including one with no routes (expect "No request flows found") and one with more than 80 files (expect the flow filter on by default).
- Write a short `README.md`: setup steps, env variables (link to PRD Section 12), and how to run tests.

**Definition of Done**: all tests pass, `npm run build` succeeds, and the three-repo run is recorded in a short note.

### Phase 8: Deploy

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add the five environment variables in Vercel project settings (not the file).
4. In Supabase, set Site URL and add the Vercel callback URL under Redirect URLs.
5. Run the full demo flow once on the production URL.

## 5. Rules for the agent during coding

- Keep API routes thin: validate input, call a `lib/` function, return JSON. Business logic belongs in `lib/`.
- Every API route checks the signed-in user first and returns 401 if there is none.
- Never trust AI output. Always parse with Zod and run `validate.ts` before saving or displaying.
- Student answers are rendered as plain text (no `dangerouslySetInnerHTML`).
- Log prompt size, latency, model, and validation result. Never log file contents or answers.
- If a step needs a credential you don't have, leave a `TODO` and continue with the mocked version. Don't invent keys.

## 6. Test fixture: login flow

Use this as `tests/fixtures/login.json`. It's the same example as the planning doc, so the expected graph and challenge are known in advance.

```json
{
  "routes/login.js": "const express = require('express');\nconst bcrypt = require('bcrypt');\nconst { findUserByEmail } = require('../models/user');\n\nconst router = express.Router();\n\nrouter.post('/login', async (req, res) => {\n  const user = await findUserByEmail(req.body.email);\n  if (!user) return res.status(401).json({ error: 'Invalid credentials' });\n\n  const ok = await bcrypt.compare(req.body.password, user.passwordHash);\n  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });\n\n  res.json({ message: 'Logged in' });\n});\n\nmodule.exports = router;",
  "models/user.js": "const users = [\n  { email: 'a@test.com', passwordHash: '$2b$10$...' }\n];\n\nasync function findUserByEmail(email) {\n  return users.find(u => u.email === email);\n}\n\nmodule.exports = { findUserByEmail };",
  "app.js": "const express = require('express');\nconst loginRoute = require('./routes/login');\n\nconst app = express();\napp.use(express.json());\napp.use('/api', loginRoute);\n\napp.listen(3000);",
  "utils/logger.js": "module.exports = { log: console.log };"
}
```

Expected results:

- **Graph edges:** `routes/login.js` → `models/user.js`; `app.js` → `routes/login.js`.
- **Flow selection for `'/login'`:** `routes/login.js` and `models/user.js`. `app.js` is a caller, not part of the flow. `utils/logger.js` is excluded.
- **Expected facts for the challenge:** the route calls `findUserByEmail` with the body email (`routes/login.js`, line 8); `findUserByEmail` searches an array (`models/user.js`, lines 5 to 7); `bcrypt.compare` checks the password (`routes/login.js`, line 11).

## 7. Final checklist before the demo

- [ ] Analyze a repo, answer three questions, and see grades with citations
- [ ] Graph highlights the cited files
- [ ] Sign in, leave, come back, and resume the session
- [ ] Dashboard shows the session and score
- [ ] Thumbs up or down is saved
- [ ] No secret keys appear in the browser (check the Network tab and the built JavaScript)
- [ ] Supabase project is not paused

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
