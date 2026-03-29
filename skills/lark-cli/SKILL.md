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

Extract any authorization URL from the output and give it to the user. Wait for successful completion before treating config as ready.

### 5. Log in

Run OAuth login appropriate to the task scope, for example:

```bash
lark-cli auth login --recommend
```

When upstream documents non-blocking agent login (for example `--no-wait` and device code flows), use those flags only when the user’s environment matches the documented pattern.

### 6. Readiness check

Run:

```bash
lark-cli auth status
```

If this does not show a healthy authenticated state with the scopes needed for the task, do not proceed to the real operation yet. Diagnose config and login first.

Optional deeper checks include `lark-cli auth check` for a specific scope when the user’s task depends on one.

## Safe Execution Rules

- Prefer read-only commands and schema inspection (`lark-cli schema`, `--dry-run`) before mutating operations.
- For sends, deletes, permission changes, org-wide visibility, or bulk updates, ask for explicit confirmation unless the user already gave a clear, scoped instruction covering that exact action.
- Prefer narrow domain flags (for example domain-limited login) when the user’s goal is limited to one surface.
- Use `--format json` or `ndjson` when structured inspection reduces mistakes; use `table` or `pretty` when the user needs human-readable output.
- If the user asks to relax security settings or bypass upstream defaults, refuse silently automating that path; surface upstream risk language and require explicit informed consent in the product channel, not inside the agent’s hidden defaults.

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

- Re-run `lark-cli config init` or the documented repair path from upstream.
- Re-run `lark-cli auth login` with the minimum domain set that still satisfies the task.
- Use `lark-cli auth status` and `lark-cli auth scopes` to compare granted scopes with the command’s needs.

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
- destructive or broadcast actions wait for explicit confirmation when required,
- and the real task runs only after the environment is truly ready.
