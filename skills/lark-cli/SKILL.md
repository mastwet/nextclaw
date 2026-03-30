---
name: lark-cli
description: Use when the user wants to operate Lark or Feishu via the local lark-cli (@larksuite/cli), including install, app credentials, OAuth, readiness checks, and safe read/write boundaries.
---

# Lark CLI (larksuite/cli)

## Overview

Use this skill to help the user work through a local [`lark-cli`](https://github.com/larksuite/cli) installation from inside NextClaw.

This skill is intentionally decoupled:

- The skill owns explanation, onboarding, readiness checks, workflow choice, risk handling, and permission clarity.
- The `lark-cli` binary owns actual execution against the Lark/Feishu Open Platform APIs.

From the user’s point of view, the experience should feel complete:

- install the CLI (and optionally upstream skill assets when needed),
- configure app credentials and complete OAuth,
- verify readiness with observable commands,
- then run the real task.

Do not pretend the environment is ready when it is not.
Treat browser completion, terminal success text, and real readiness as three separate things. Only observable CLI checks count as success.

## What This Skill Covers

- Installation paths documented upstream (for example global npm install of `@larksuite/cli`).
- One-time app credential setup: `lark-cli config init` (or `lark-cli config init --new` when a browser-based setup URL must be handed to the user).
- Authentication: `lark-cli auth login` (including `--recommend` when appropriate), `lark-cli auth status`, and scope-aware flows described in upstream docs.
- Command discovery via `lark-cli --help` and `lark-cli <service> --help`.
- Shortcuts (commands prefixed with `+`), curated API commands, and raw `lark-cli api` calls only as supported by the installed CLI version.
- Security expectations: acting within granted OAuth scopes, dry-run where available, and explicit confirmation before high-impact writes.

## What This Skill Does Not Cover

- Inventing subcommands, shortcuts, or API paths that do not appear in the installed CLI help or upstream documentation.
- Claiming tenant permissions, plan limits, or compliance posture the user’s app or admin policies do not allow.
- Silently bypassing missing app configuration or failed login.
- Silently triggering messaging sends, file uploads, deletions, permission changes, or other high-impact actions without explicit user confirmation when the situation calls for it.
- Treating Lark/Feishu platform behavior or third-party CLI output as native NextClaw behavior.

## First-Use Workflow

When the user asks for a `lark-cli`-powered task, follow this order.

Before taking action, classify the environment into exactly one state and move only to the next state:

- CLI missing
- configured = no
- config in progress
- configured = yes, logged in = no
- login in progress
- ready

Do not start a second config or login flow while one is already in progress. Finish, verify, then continue.

### 1. Classify the task

Classify the task into one of these:

- read-only (list, view, search, export, `auth status`, schema introspection),
- write or side-effect (send messages, create/update/delete resources, share, permission changes),
- long-running or interactive (OAuth URL, device code, background polling).

If the task does not fit what the CLI exposes, say so clearly.

### 2. Check whether the CLI exists

Run:

```bash
command -v lark-cli
```

If missing, explain that the CLI must be installed locally first. Prefer the upstream-recommended global install:

```bash
npm install -g @larksuite/cli
```

After installation, continue with configuration and auth instead of jumping straight into the user task.

### 3. Optional upstream skill bundle

Upstream documents installing additional Agent Skill files globally:

```bash
npx skills add larksuite/cli -y -g
```

Treat this as optional unless the user is following upstream tutorials that assume those files exist, or the CLI reports missing skill assets. Do not present it as a NextClaw marketplace replacement; it is an upstream packaging choice.

### 4. Configure app credentials

Guide the user through credential setup:

```bash
lark-cli config init
```

For agent-style flows where the process prints a URL and expects browser completion, use the non-interactive variant described upstream, for example:

```bash
lark-cli config init --new
```

For agent-style flows:

- run `lark-cli config init --new` in the background,
- extract the printed browser URL and send it to the user,
- wait for the process to exit before treating configuration as finished.

Config success gate:

- the process exits with code `0`, and
- `lark-cli config show` shows a concrete `appId`, and
- `lark-cli doctor` shows `config_file=pass` and `app_resolved=pass`.

If the browser page is opened but the command is still waiting, configuration is not finished yet.
If `config init --new` succeeds once, do not immediately rerun it unless `config show` or `doctor` proves config is still missing or broken.

### 5. Log in

Prefer the non-looping agent pattern:

```bash
lark-cli auth login --recommend --no-wait --json
```

Then use the returned `device_code` to resume polling:

```bash
lark-cli auth login --device-code <DEVICE_CODE>
```

This keeps the flow explicit:

- first command returns the verification URL immediately,
- second command is the single polling process,
- and the agent can avoid repeatedly spawning fresh login sessions.

Login success gate:

- the polling command exits with code `0`, and
- `lark-cli auth status` shows `identity: "user"`, and
- `lark-cli doctor` reports `token_exists=pass`, `token_local=pass`, and ideally `token_verified=pass`.

If login prints success text but `auth status` still shows `identity: "bot"`, treat that as not ready. Do not continue to real user-scoped operations.
If a device-code session is already pending, do not restart `auth login --recommend`; continue or expire that session first.

### 6. Readiness check

Run:

```bash
lark-cli auth status
```

If this does not show a healthy authenticated state with the scopes needed for the task, do not proceed to the real operation yet. Diagnose config and login first.

Optional deeper checks include `lark-cli auth check` for a specific scope when the user’s task depends on one.

Readiness means all of these are true:

- config exists,
- current identity is the one required by the task,
- required scopes are present,
- and a lightweight read command for that domain succeeds when feasible.

Examples:

- Before task operations: `lark-cli auth status` and `lark-cli auth check --scope "task:task:write"`
- Before message send: inspect help and do `--dry-run` first if available
- Before broad automation: prefer one narrow read command in the same domain

## Observable Success Rules

Use these rules to avoid fake success and retry loops:

- `config init --new` is successful only after the process exits and `config show` or `doctor` confirms config is resolved.
- `auth login` is successful only after `auth status` says `identity: "user"`.
- A write operation is successful only after the CLI returns a stable identifier or the resource can be fetched again.
- Do not treat “user opened the browser page” as success.
- Do not treat “command is still waiting” as a cue to start the same flow again.
- If a command returns a concrete resource id or guid, store and reuse that id for verification instead of relying on fuzzy search.

## Safe Execution Rules

- Prefer read-only commands and schema inspection (`lark-cli schema`, `--dry-run`) before mutating operations.
- For sends, deletes, permission changes, org-wide visibility, or bulk updates, ask for explicit confirmation unless the user already gave a clear, scoped instruction covering that exact action.
- Prefer narrow domain flags (for example domain-limited login) when the user’s goal is limited to one surface.
- Use `--format json` or `ndjson` when structured inspection reduces mistakes; use `table` or `pretty` when the user needs human-readable output.
- If the user asks to relax security settings or bypass upstream defaults, refuse silently automating that path; surface upstream risk language and require explicit informed consent in the product channel, not inside the agent’s hidden defaults.

Task-specific rule:

- `task +get-my-tasks` means “tasks assigned to me”, not “every task I created”.
- A task created without `--assignee` may be retrievable by `task tasks get` but not appear in `+get-my-tasks`.
- For task creation verification, prefer this sequence:

```bash
lark-cli task +create ... --format json
lark-cli task tasks get --params '{"task_guid":"<GUID>"}' --format json
```

- If the user wants the task to appear under “my tasks”, assign it explicitly to the current user with `--assignee <open_id>`.

## Privacy, Trust, And Compliance

This CLI can act on behalf of a logged-in user or bot identity within OAuth scopes. Surface that:

- Data may include messages, files, mail, calendar, contacts, and other tenant content.
- Mis-scoped automation can leak sensitive information or send messages to the wrong audiences.
- Upstream documentation includes security warnings; do not downplay them.

When the user is unsure, default to smaller scope, fewer recipients, and read-only verification first.

## Troubleshooting

### `lark-cli` not found

- Explain that Node/npm global install may be missing or not on `PATH`.
- Re-check with `command -v lark-cli` after install.

### Config or auth errors

- Do not blindly rerun both config and login.
- First ask which state failed:
  - `doctor` says config missing or unresolved
  - `auth status` says bot only / not logged in
  - `auth status` says user but scope is insufficient
  - domain read/write command itself failed
- Re-run only the failed stage.
- Use `lark-cli auth status` and `lark-cli auth scopes` to compare granted scopes with the command’s needs.
- If using agent mode, prefer `auth login --no-wait --json` plus `auth login --device-code ...` over repeatedly launching fresh blocking login commands.

### Repeated waiting or apparent loop

- If a `config init --new` or `auth login --device-code` process is already active, keep that single session as the source of truth.
- If the user says they completed the browser step, poll the existing process and then verify with `config show`, `doctor`, or `auth status`.
- Only declare timeout or failure after the current session exits or the device code expires.
- Never stack multiple concurrent login attempts just because the terminal is still waiting.

### Command not recognized

- Inspect `lark-cli --help` and `lark-cli <service> --help` for the installed version.
- Do not guess shortcut names; confirm from help output.

### Rate limits, permission denied, or tenant policy errors

- Treat these as platform or admin policy constraints, not as something to bypass inside NextClaw.

## Success Criteria

The skill is working correctly when:

- the user understands that execution is performed by local `lark-cli` against Lark/Feishu APIs under their app and tokens,
- missing install, config, or login is identified before side effects,
- `lark-cli auth status` reflects readiness before high-trust tasks when feasible,
- config success and login success are judged by observable CLI state rather than browser completion alone,
- the agent follows a single in-flight config/login session instead of spawning repeated retries,
- task or resource writes are verified by concrete ids or follow-up reads,
- destructive or broadcast actions wait for explicit confirmation when required,
- and the real task runs only after the environment is truly ready.
