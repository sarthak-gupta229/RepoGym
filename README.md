# RepoGym 🏋️‍♂️

> Master codebases through interactive dependency mapping, request tracing, and AI-evaluated comprehension challenges.

RepoGym turns any public GitHub repository into an interactive training session. Paste a repository URL to explore how its files connect in an interactive dependency graph, trace execution across API request flows, and answer sequential questions about the code. Answers are graded by AI against the actual codebase with verified file and line citations.

---

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router, TypeScript, React 19)
- **UI & Styling**: Tailwind CSS
- **Interactive Graph**: React Flow (`@xyflow/react`) with Dagre layout (`@dagrejs/dagre`, `rankdir: "LR"`)
- **Validation**: Zod & custom citation/bounds verification
- **GitHub Ingestion**: GitHub REST API & `raw.githubusercontent.com` with 150-file cap & 20 KB limit
- **AI Gateway & Model**: OpenRouter via OpenAI SDK (`nvidia/nemotron-3-ultra-550b-a55b:free`)
- **Database & Auth**: Supabase PostgreSQL, Supabase Auth & Row Level Security (RLS)
- **Testing**: Vitest

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+ (Node.js 22 or 25 recommended)
- npm or pnpm

### 2. Environment Variables (`.env.local`)
Create a `.env.local` file in the root directory (never commit this file):

```bash
# AI Evaluation (OpenRouter)
OPENROUTER_API_KEY="your-openrouter-api-key"

# GitHub REST API Token (raises rate limit to 5,000 req/hr)
GITHUB_TOKEN="your-github-personal-access-token"

# Supabase Database & Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-admin-key"
```

### 3. Installation

```bash
npm install
```

### 4. Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Home**: Paste any public GitHub repo (e.g. `expressjs/express`) or click the demo link.
- **Interactive Graph & Explorer**: [http://localhost:3000/repos/demo](http://localhost:3000/repos/demo)
- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

Select **Take a tour** on the home page to learn the basics and open the guided Express login demo. Use **Tutorial** on the repository, session, hackathon, dashboard, or sign-in screen to replay that chapter. The session and hackathon chapters show different tips after grading and on the final scorecard.

---

## 🧪 Testing

Run the Vitest test suite covering GitHub ingestion, graph building, Dagre layout, prompt generation, Zod schemas, citation checks, full sessions, RLS isolation, and rate limits:

```bash
npm test
```

---

## 📦 Production Build

```bash
npm run build
npm start
```

---

## 🔒 Security & Data Integrity Rules
- Secret keys (`OPENROUTER_API_KEY`, `GITHUB_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`) are kept strictly on the server and never sent to the browser.
- Student answers are sanitized and rendered as plain text.
- Validation checks ensure every cited file exists and all line ranges are strictly within the actual file length.

