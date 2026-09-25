# Codex Web GUI ⚡

A high-performance, browser-first control center and visual workbench for the **Codex CLI**.

`codex-web-gui` transforms the local Codex terminal experience into an interactive developer workbench with real-time terminal streaming, granular hunk-by-hunk patch staging, side-by-side diff review, timeline rollbacks, token usage analytics, guardrail policies, and audit logs.

---

## 📖 Complete Step-by-Step Guide: From Scratch to Production

Follow this complete walkthrough to set up, run, and master all workflows in `codex-web-gui`.

```text
 ┌────────────────┐     ┌──────────────────┐     ┌────────────────────┐     ┌──────────────────┐
 │ 1. Quick Start │ ──> │ 2. Create Session│ ──> │ 3. Pin Context &  │ ──> │ 4. Review Diffs & │
 │   Setup & Env  │     │   & Workspace    │     │    Submit Prompt   │     │    Accept Hunks  │
 └────────────────┘     └──────────────────┘     └────────────────────┘     └──────────────────┘
                                                                                      │
 ┌────────────────┐     ┌──────────────────┐     ┌────────────────────┐               │
 │ 7. Activity    │ <── │ 6. Track Tokens  │ <── │ 5. Verify Tests &  │ <─────────────┘
 │    Audit Logs  │     │    & Set Budgets │     │    Rollback Safely │
 └────────────────┘     └──────────────────┘     └────────────────────┘
```

---

### 🔹 Step 1: First-Time Setup & Prerequisites

1. **Verify Prerequisites:**
   * **Node.js 20+** installed: `node -v`
   * **npm** or **pnpm** installed: `npm -v`
   * **Codex CLI** installed and available in your terminal path: `codex --version`

2. **Clone the repository:**
   ```bash
   git clone https://github.com/RSaha0507/codex-web-gui.git
   cd codex-web-gui
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Initialize Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

---

### 🔹 Step 2: Start the Web Control Room

Launch the local development server:
```bash
npm run dev
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 🔹 Step 3: Create a Session & Select Your Workspace

1. On the Home Dashboard, click **"+ New Session"** (or click any repository in **Recent Workspaces**).
2. Configure your session parameters:
   * **Working Directory (`cwd`):** The absolute or relative path to your codebase (e.g. `/home/user/my-app` or `.`).
   * **AI Model:** Select `gpt-5-codex`, `gpt-4o`, `claude-3-7-sonnet`, `o3-mini`, or `gemini-2.5-pro`.
   * **Approval Mode:**
     * `suggest` *(Recommended)*: Codex prompts for manual approval on every command or file modification.
     * `auto-edit`: Auto-applies safe file patches, prompts for shell command execution.
     * `full-auto`: Fully autonomous execution.
   * **Instruction Preset (Optional):** Choose from built-in presets:
     * 🧪 *Strict TypeScript & TDD*
     * 🏛️ *Refactoring & Clean Architecture*
     * 🛡️ *Security & Defensive Coding*
     * ⚛️ *Modern React 19 & Tailwind CSS*
     * 🚀 *Fast Prototyping & MVP*
3. Click **"Create & Launch Session"**. You will immediately be routed to the 3-panel **Session Control Room**.

---

### 🔹 Step 4: Pin Context Files & Submit Prompts

1. **Browse Working Tree:** The left sidebar displays the real-time file tree of your target workspace.
2. **Pin Context Files (`+` Pin):**
   * Hover over any file (e.g., `src/auth.ts` or `schema.prisma`) and click the **`+` Pin** button.
   * The file is attached to the **Context Drawer** above your prompt bar, ensuring Codex has complete snapshot context.
3. **Draft & Send Instructions:**
   * Enter your task in the bottom prompt input (e.g., *"Refactor database queries in auth.ts to use transactions and write vitest unit tests"*).
   * Press **`Enter`** (or `Ctrl+Enter` / `Cmd+Enter` for multi-line) to submit.
4. **Watch Live Output:** The center terminal renders xterm.js ANSI streaming output as Codex reasons, searches, and generates code.

---

### 🔹 Step 5: Review Diffs & Accept Patches (Diff Workbench)

When Codex proposes modifications, the right sidebar opens the **Diff Workbench**:

1. **Navigate Modified Files:** Click any modified file tab to inspect proposed additions (`+`) and deletions (`-`).
2. **Toggle Diff Layout:**
   * Click **Unified** for standard inline diffing.
   * Click **Split** for 2-column side-by-side visual comparison.
3. **Granular Hunk Acceptance:**
   * Accept or reject specific code blocks independently.
   * Click **"Accept Hunk"** on the hunks you want, and click **"Apply Accepted Hunks"** to write only those parts.
4. **Direct In-Browser Quick Edits:**
   * Click **"Direct Edit"** to modify file content directly in the browser editor before approving.
5. **Approval Confirmation:**
   * Use the bottom **Approval Bar** (`[Approve (y)]` or `[Reject (n)]`) to signal your decision to the Codex process.

---

### 🔹 Step 6: Verify with 1-Click Test Runner

Never blindly commit changes without running your test suite:

1. Click **"Run Tests"** in the top action toolbar (or in the Approval Bar).
2. The **Test Verification Modal** executes your configured test command (`npm test`, `vitest`, `pytest`, `cargo test`).
3. If tests fail:
   * Click **"Send Error to Codex Prompt"** to immediately pipe the compiler/test failure output back to Codex for automatic remediation.

---

### 🔹 Step 7: Scrub Timeline Checkpoints & 1-Click Rollbacks

Every prompt automatically creates a timestamped state snapshot:

1. Switch to the **"Timeline"** tab in the right sidebar.
2. View chronological checkpoints showing affected files and prompt summaries.
3. Click **"Rollback to this Checkpoint"** to immediately revert all files back to their exact snapshot state.

---

### 🔹 Step 8: Track Real-Time Tokens & Configure Budget Alerts

1. Look at the **Token & Cost Badge** in the top navigation bar. It displays live estimated USD cost, total token volume, and % context capacity.
2. Click the badge to open the full **Token Tracker & Budget Inspector**:
   * **Context Window Gauge:** Visual indicator of your model's context capacity (e.g. 128k / 200k / 1M limit).
   * **Turn-by-Turn Table:** Inspect input tokens, output tokens, and USD cost for each prompt turn.
   * **Multi-Model Price Matrix:** Compare how much this session would cost on GPT-5 Codex, GPT-4o, Claude 3.7 Sonnet, Gemini 2.5 Flash, or DeepSeek R1.
   * **Session Budget Alert:** Set a budget limit ($0.50, $1.00, $5.00) with visual warning thresholds.
   * **Export Token Receipt:** Download a complete JSON usage report.

---

### 🔹 Step 9: Audit Activity & Export Event Logs

1. Switch to the **"Logs"** tab in the right sidebar (or click **"Activity Audit Logs"** on the home dashboard).
2. Filter events by category (*Prompts*, *File Patches*, *Approvals & Policies*, *Test Suite*, *Rollbacks*).
3. Filter by actor (*User*, *Codex*, *Guardrail Policy*, *System*).
4. Click any event row to expand formatted JSON payload details.
5. Click **"Export JSON"** or **"Export CSV"** to save an audit trail for compliance or record-keeping.

---

### 🔹 Step 10: Multi-Project Switching & Guardrails Management

* **Switch Workspace on the Fly:** Click the workspace dropdown in the top-left to seamlessly switch between multiple local repositories without losing session state.
* **Configure Guardrails (`/settings`):**
  * Create custom regex patterns to auto-approve routine commands (`git status`, `npm run build`).
  * Add protection rules to block or demand confirmation for sensitive files (`.env*`, `id_rsa`, `rm -rf`).

---

## ✨ Key Features & Capabilities

### ⚡ 1. Interactive Multi-File Patch & Approval Workbench
* **Granular Hunk-by-Hunk Acceptance:** Selectively stage, accept, or reject individual diff hunks before applying modifications.
* **Side-by-Side vs. Unified Diff Mode:** Toggle instantly between 2-column split comparisons and inline unified diff views with syntax highlighting.
* **Direct In-Browser Quick Edits:** Make line-level tweaks directly inside the diff workbench before sending approvals back to Codex.
* **Multi-File Staging:** Seamlessly navigate between modified files with badge indicators and line add/delete counters.

### 🗂️ 2. File Context & Prompt Pinning ("Context Drawer")
* **Working Tree Context Builder:** Click the `+` icon next to any file in the tree to attach it as an `@file` context reference in your next prompt.
* **Instruction Presets & Rule Importer:** Built-in and custom persona presets (e.g. *Strict TypeScript & TDD*, *Clean Architecture*, *Security & Defensive Coding*, *Fast MVP*).
* **Workspace Auto-Discovery:** Automatically scans and detects `CODEX.md`, `.cursorrules`, `CLAUDE.md`, and `.github/copilot-instructions.md` inside your working directory.

### ⏱️ 3. Session Replay & Rollback Checkpoints
* **Visual Git-Like Timeline:** Scrub through each prompt iteration, viewing touched files, staged diffs, and executed commands.
* **1-Click Rollback:** Restore file snapshots to any previous prompt turn without leaving the browser.

### 🛡️ 4. Guardrails & Auto-Approval Engine
* **Policy Rule Matcher:** Auto-approve safe read-only operations (`git status`, `git diff`, `npm test`, directory listings) while enforcing strict manual approval for destructive commands (`rm -rf`, `git push`, `.env` modifications).
* **Custom Guardrail Rules:** Create, edit, and toggle custom regex-based approval policies in Settings.
* **1-Click Test Verification Runner:** Run `npm test`, `vitest`, or `pytest` immediately against pending diffs with ANSI output terminal and an *"Ask Codex to Fix"* error bridge.

### 📦 5. Workspace / Multi-Project Switcher
* **Recent Repositories Dashboard:** Quickly jump between multiple local repositories (`cwd`) with isolated session histories.
* **Session Counts & Timestamps:** Track activity and bookmark frequent projects.

### 📋 6. Activity & Audit Logs
* **Persistent Event Audit Trail:** Automatically records all prompts, diffs, approvals, test runs, rollbacks, and file edits into SQLite.
* **Interactive Log Explorer:** Live search, actor filtering (`user`, `codex`, `guardrail`, `system`), category tabs, and expandable JSON payloads.
* **Export Reports:** 1-click download of audit logs in **JSON** or **CSV** format.

### 🪙 7. Real-Time Token Tracker & Budget Inspector
* **Token Breakdown:** Live prompt tokens, completion tokens, system/preset tokens, and USD cost estimation.
* **Context Window Capacity Gauge:** Visual progress bar tracking consumption against model limits (e.g., 128k / 200k / 1M tokens).
* **Turn-by-Turn Usage Inspector:** View token consumption and cost for each prompt turn.
* **Multi-Model Cost Comparison:** Real-time pricing comparison against GPT-5 Codex, GPT-4o, Claude 3.7 Sonnet, Gemini 2.5 Pro/Flash, and DeepSeek R1.
* **Configurable Budget Alerts:** Set custom session budget caps ($0.50, $1.00, $5.00, $10.00) with visual threshold warnings.

---

## 🏗️ Architecture & Stack

* **Frontend:** [React 19](https://react.dev/), [TanStack Start](https://tanstack.com/start), [TanStack Router](https://tanstack.com/router), [Tailwind CSS v4](https://tailwindcss.com/)
* **Terminal Engine:** [`node-pty`](https://github.com/microsoft/node-pty) & [`@xterm/xterm`](https://xtermjs.org/) with ANSI formatting & SSE streaming
* **Persistence:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode, foreign key cascades, and in-memory fallback)
* **File Watcher & Diff Engine:** [Chokidar](https://github.com/paulmillr/chokidar) & [diff](https://github.com/kpdecker/jsdiff)

---

## ⚙️ Configuration (.env)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | `""` | Optional if Codex CLI authentication is already active in your shell |
| `CODEX_DEFAULT_MODEL` | `gpt-5-codex` | Default AI model for newly spawned sessions |
| `CODEX_DEFAULT_APPROVAL` | `suggest` | Approval mode: `suggest`, `auto-edit`, or `full-auto` |
| `CODEX_DEFAULT_CWD` | `.` | Default initial working directory |
| `CODEX_DATA_DIR` | `~/.codex-gui` | Directory where SQLite database and file caches are stored |
| `HOST` | `0.0.0.0` | Bind host address |
| `PORT` | `3000` | Web server port |

---

## 📁 Directory Structure

```text
src/
├── components/            # UI components
│   ├── ActivityLogsModal.tsx   # Global activity audit modal
│   ├── ActivityLogsViewer.tsx  # Interactive log viewer & CSV/JSON exporter
│   ├── ApprovalBar.tsx         # Guardrail-aware approval bar
│   ├── ContextDrawer.tsx       # @file pinning & rule preset drawer
│   ├── DiffViewer.tsx          # Multi-file patch workbench & split diff viewer
│   ├── FileTree.tsx            # Interactive workspace tree with 1-click pinning
│   ├── GuardrailsSettings.tsx  # Guardrail policy configuration
│   ├── PromptInput.tsx         # Rich prompt input with pinned context chips
│   ├── SessionList.tsx         # Session history & status list
│   ├── StatusBar.tsx           # Status bar with model, connection, and test triggers
│   ├── Terminal.tsx            # Real-time xterm.js terminal stream
│   ├── TestRunnerModal.tsx     # 1-click test suite execution & error bridge
│   ├── TimelineReplay.tsx      # Checkpoint history & rollback scrub bar
│   ├── TokenCostBadge.tsx      # Real-time token badge & inspector trigger
│   ├── TokenTrackerModal.tsx   # Full token & budget analytics inspector
│   └── WorkspaceSwitcher.tsx   # Multi-project directory selector
├── lib/                   # Shared types, constants, and diff algorithms
│   ├── constants.ts
│   ├── diffUtils.ts
│   └── types.ts
├── routes/                # TanStack Start file-based routing
│   ├── __root.tsx              # Root shell, header, and layout
│   ├── index.tsx               # Home dashboard & repository browser
│   ├── session.$sessionId.tsx  # Primary 3-panel session control room
│   ├── settings.tsx            # Settings & guardrail management
│   └── api.*.ts                # SSE streaming & terminal interrupt endpoints
└── server/                # Backend runtime & database layer
    ├── diff.ts                 # Unified diff parsing & patch application
    ├── files.ts                # Safe filesystem reads/writes & rule discovery
    ├── functions.ts            # Type-safe TanStack server functions
    ├── health.ts               # Codex CLI detection & cross-platform diagnostics
    ├── pty.ts                  # node-pty process manager & guardrail runner
    ├── sessions.ts             # SQLite schemas, activity logs, and checkpoints
    ├── settings.ts             # Application settings store
    ├── testRunner.ts           # Test execution subprocess runner
    └── watcher.ts              # Chokidar workspace file watcher
```

---

## 🧪 Development & Quality Checks

Run linting and type-checking before committing changes:

```bash
# Lint codebase with ESLint
npm run lint

# TypeScript compilation check
npm run build
```

---

## 🔒 Security & Local Execution Notes

* **Local-First Design:** All code execution, file changes, and SQLite logs remain entirely on your local machine.
* **Protected File Boundaries:** Path operations are sanitized to prevent directory traversal outside the active session `cwd`.
* **Guardrails Protection:** Critical operations (`rm -rf`, `git push`, modifying `.env` / credentials) automatically flag warnings requiring explicit operator confirmation.

---

## 📄 License

MIT © [RSaha0507](https://github.com/RSaha0507)
