# Codex CLI Web GUI

`codex-web-gui` is a local-first browser interface for the Codex CLI.

It wraps a real `codex` terminal session in a three-panel web app so you can:

- start and resume Codex sessions from the browser
- stream raw terminal output live over SSE
- review file changes and diffs as Codex edits your workspace
- persist sessions, messages, and file history in SQLite
- handle approval prompts without leaving the UI

This project is designed for people who already operate the Codex CLI and want a more usable local control surface around it.

## What You Get

- Home page for session creation and session history
- Active session view with:
  - terminal stream
  - file tree
  - diff viewer
  - prompt input
  - approval controls
  - connection status
- Settings page for defaults and storage location
- SQLite-backed session history
- filesystem watching with before/after snapshots
- Windows-friendly Codex detection for `codex.cmd`

## Stack

- TanStack Start
- React 19
- `node-pty`
- `better-sqlite3`
- `chokidar`
- `diff`
- `xterm.js`

## Requirements

- Node.js 20+
- npm
- Codex CLI installed and working locally
- One of:
  - an existing Codex CLI login/session
  - `OPENAI_API_KEY` configured for Codex use

## Install

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Configure Codex access

Use either:

- Codex CLI login that already works in your terminal
- `OPENAI_API_KEY` inside `.env`

### 4. Start the app

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Quick Start

1. Open the home page.
2. Click `New Session`.
3. Choose a working directory, model, and approval mode.
4. Start the session.
5. Watch terminal output in the center panel.
6. Send prompts from the bottom input.
7. Review changed files on the left and diffs on the right.

## Using It With Codex CLI

This app does not emulate Codex. It starts the real CLI in a PTY and streams the terminal output into the browser.

That means normal Codex CLI behavior still applies:

- first-run trust prompts may appear
- Codex may ask for sandbox setup on Windows
- approval decisions can still be required depending on mode
- any CLI-specific startup message will appear in the terminal panel

If Codex shows an interactive menu, answer it through the prompt input in the app just like you would in a terminal.

## Approval Modes

- `suggest`
  Codex can work in the workspace sandbox but may still stop and ask for approval.

- `auto-edit`
  Codex edits automatically inside the workspace sandbox with approval disabled.

- `full-auto`
  Uses the CLI `--full-auto` preset.

## Layout

### Left Panel

- session list
- file tree for the active working directory

### Center Panel

- live terminal
- approval bar
- prompt input
- session status bar

### Right Panel

- reverse-chronological diff history

## Configuration

The app reads settings from `.env` and lets you update them from the Settings page.

### Environment Variables

```env
OPENAI_API_KEY=sk-...
CODEX_DEFAULT_MODEL=gpt-5-codex
CODEX_DEFAULT_APPROVAL=suggest
CODEX_DEFAULT_CWD=~
CODEX_DATA_DIR=~/.codex-gui
PORT=3000
HOST=127.0.0.1
```

### Meaning

- `OPENAI_API_KEY`
  Optional if your Codex CLI login already works.

- `CODEX_DEFAULT_MODEL`
  Default model for new sessions.

- `CODEX_DEFAULT_APPROVAL`
  Default approval mode for new sessions.

- `CODEX_DEFAULT_CWD`
  Default working directory shown in the session modal.

- `CODEX_DATA_DIR`
  Where the app stores SQLite data and local state.

- `HOST` / `PORT`
  Web server bind address.

## Storage

By default the app stores data in:

```text
~/.codex-gui
```

The SQLite database is:

```text
~/.codex-gui/data.db
```

Stored data includes:

- sessions
- terminal history
- user and assistant messages
- file change records
- diff snapshots

## Windows Notes

This project includes Windows-specific Codex detection so the app can find and launch `codex.cmd` correctly even when direct `spawnSync` checks are unreliable.

Important Windows behavior:

- the first session in a directory may trigger Codex trust prompts
- Codex may ask you to choose a sandbox mode
- some sandbox options require Administrator permissions
- if a CLI setup menu appears, answer it in the app prompt input

## Troubleshooting

### `codex` is not available in PATH

Verify Codex works in a terminal first:

```powershell
codex --version
```

If that fails, install or repair the Codex CLI before using the app.

### The app shows Codex is detected, but the session waits on a menu

That usually means Codex is asking a real first-run question, for example:

- trust this directory
- choose a sandbox mode
- choose a model migration option

Use the prompt input to answer the menu.

### The live stream disconnects

Use the `Reconnect` button on the session page. Session history is persisted locally, so reconnecting does not wipe prior output.

### File changes are missing

Make sure Codex is editing files under the configured working directory. The watcher only tracks files inside the session `cwd`.

### Database path or settings look wrong

Check the Settings page and `.env`. The app expands `~` to your home directory.

## Development

### Run checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

### Project Structure

```text
src/routes              UI routes and API routes
src/components          Terminal, file tree, diff, prompt, status UI
src/server              PTY runtime, storage, stream, watcher, settings
src/lib                 shared constants and types
scripts/setup.sh        basic setup helper
```

## Architecture Summary

- `src/server/pty.ts`
  Starts and manages live Codex PTY sessions

- `src/server/health.ts`
  Detects Codex availability and version, including Windows handling

- `src/server/sessions.ts`
  Owns SQLite persistence

- `src/server/watcher.ts`
  Watches the active workspace and records file changes

- `src/server/stream.ts`
  Pushes session events to the browser over SSE

- `src/server/functions.ts`
  TanStack server functions for session actions

## Known Limitations

- approval requests are inferred from terminal output, not from a structured Codex event API
- the optional system prompt is injected into the first user request because the terminal CLI does not expose a true out-of-band system channel
- first-run Codex CLI setup prompts still need operator input

## Safety

This is a local operator tool, not a hosted multi-user service.

You are still responsible for:

- choosing safe working directories
- understanding the selected approval mode
- reviewing diffs before allowing changes
- treating first-run trust and sandbox prompts carefully

## License / Ownership

Add your preferred license before publishing if you want reuse terms to be explicit.
