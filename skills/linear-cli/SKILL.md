---
name: linear-cli
description: Use when the user wants to list, view, start, create, or update Linear issues from the terminal via schpet/linear-cli, including setup, auth, repo config, and safe read/write boundaries.
---

# Linear CLI (schpet/linear-cli)

## Overview

Use this skill to help the user work through a local [`linear`](https://github.com/schpet/linear-cli) installation from inside NextClaw.

This skill is intentionally decoupled:

- The skill owns explanation, onboarding, readiness checks, workflow choice, and risk handling.
- The `linear` CLI owns actual execution against Linear’s API and the user’s git or Jujutsu workspace.

From the user’s point of view, the experience should feel complete:

- install the CLI if needed,
- ensure authentication and project configuration,
- verify readiness with observable commands,
- then run the real task.

Do not pretend the environment is ready when it is not.

## What This Skill Covers

- Issue workflows: list, view, start, create, update, delete, comments, PR helpers (when `gh` is available as documented upstream).
- Team, project, milestone, and document commands exposed by the installed CLI.
- Git branch–based “current issue” semantics and Jujutsu `Linear-issue` trailers when the user uses `jj`.
- First-use setup: API key, `linear auth login`, and `linear config` in the target repository.
- Readiness checks and bounded troubleshooting.

## What This Skill Does Not Cover

- Inventing flags or subcommands that do not appear in `linear --help` or the installed CLI help for the relevant subcommand.
- Claiming Linear workspace permissions or plan limits the user does not have.
- Silently bypassing missing authentication or broken configuration.
- Silently triggering destructive or write actions without explicit user confirmation.
- Treating third-party CLI behavior as native NextClaw behavior.

## First-Use Workflow

When the user asks for a `linear`-powered task, follow this order.

### 1. Classify the task

Classify the task into one of these:

- read-only (view, list, print id/url/title),
- write (create/update/delete issues, start work, comments, milestones, documents),
- VCS-assisted (branch creation, issue binding).

If the task does not fit what the CLI supports, say so clearly.

### 2. Check whether the CLI exists

Run:

```bash
command -v linear
```

If missing, explain that the CLI must be installed locally first. Prefer one of these install paths and stay consistent with the user’s platform and package preferences:

- Homebrew: `brew install schpet/tap/linear` (see upstream tap name in the [repository](https://github.com/schpet/linear-cli)).
- npm (project or global): install `@schpet/linear-cli` and invoke via `npx linear` / `pnpm exec linear` / `bunx linear` as appropriate.
- Deno: follow upstream `deno install` instructions from the [README](https://github.com/schpet/linear-cli/blob/main/README.md).

After installation, continue with readiness checks instead of jumping straight into the user task.

### 3. Confirm CLI version

Run:

```bash
linear --version
```

If this fails, treat the install as broken and fix that before API-backed tasks.

### 4. Authentication and configuration

The CLI needs a Linear API key and login state. The user creates a key under Linear account security settings (see upstream docs).

Guide the user through:

```bash
linear auth login
```

For repository-specific defaults (team, workspace slug, VCS mode), run from the target repo:

```bash
linear config
```

Configuration is resolved from `./linear.toml`, `./.linear.toml`, repo root, `.config/linear.toml`, and platform-appropriate user config paths as documented upstream. Environment variables override file values when both apply.

### 5. Readiness check

Prefer a lightweight read that hits the API after auth, for example:

```bash
linear team list
```

If this fails with authentication or permission errors, do not proceed to the user’s real task. Diagnose auth, workspace, or token scope first.

### 6. Respect “current issue” rules

The CLI derives the current issue from:

- **git**: issue id embedded in the branch name (for example `ENG-123-my-feature`),
- **jj**: `Linear-issue` trailer in commit metadata.

If the user expects “current issue” behavior but the branch or trailers do not match, explain the mismatch before running issue-scoped commands.

## Safe Execution Rules

- Prefer read-only commands before write commands.
- For creates, updates, deletes, starts, comments, or other writes, ask for explicit confirmation first unless the user already gave a clear, scoped instruction for that write.
- Do not assume `gh` or a Git host CLI is installed; if the user wants `linear issue pr`, verify `gh` availability or follow upstream behavior transparently.
- If the user is in the wrong directory for `linear config` or issue context, say so and ask to switch to the intended repository root.

## Troubleshooting

### `linear` not found

- Explain that the CLI is not installed or not on `PATH`.
- Guide installation using one of the supported methods, then re-check with `command -v linear`.

### Auth or API errors on read commands

- Confirm `linear auth login` completed successfully.
- Confirm API key is valid and not revoked.
- Confirm workspace and `team_id` / defaults match the user’s intent (`linear config` and env vars).

### Wrong issue or empty “current issue”

- For git, verify the branch name contains the expected Linear issue id.
- For Jujutsu, verify `Linear-issue` trailers on the relevant commits.
- Offer `linear issue view <id>` when current-issue detection is unreliable.

### Platform differences

- Treat path and config locations as different on Windows vs Unix; follow upstream config search order instead of assuming POSIX-only paths.

## Success Criteria

The skill is working correctly when:

- the user understands that execution is performed by the local `linear` CLI against Linear,
- missing CLI, auth, or config is identified before task execution,
- a lightweight API read succeeds before heavier workflows when appropriate,
- write operations wait for explicit confirmation when required,
- and the real task runs only after the environment is truly ready.
