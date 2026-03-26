---
name: opencli
description: Use when the user wants to use websites, browser login sessions, Electron apps, or external CLIs through a local OpenCLI setup, especially when setup guidance, readiness checks, and safe task execution are needed.
---

# OpenCLI

## Overview

Use this skill to help the user work through a local `opencli` installation from inside NextClaw.

This skill is intentionally decoupled:

- The skill owns explanation, onboarding, readiness checks, workflow choice, and risk handling.
- `opencli` owns actual execution.

From the user's point of view, the experience should feel complete:

- install or update `opencli` if needed,
- guide the user through browser or app setup,
- verify readiness,
- then run the real task.

Do not pretend the environment is ready when it is not.

## What This Skill Covers

- public read-only commands,
- browser tasks that reuse the user's Chrome login session,
- Electron or desktop app adapters that `opencli` already supports,
- passthrough to external CLIs through `opencli`,
- first-use setup and troubleshooting.

## What This Skill Does Not Cover

- inventing commands that do not appear in `opencli list`,
- claiming support for a site or app that `opencli` does not actually expose,
- silently bypassing missing setup,
- silently triggering destructive or write actions,
- treating third-party runtime behavior as native NextClaw behavior.

## First-Use Workflow

When the user asks for an `opencli`-powered task, follow this order.

### 1. Classify the task

Classify the task into one of these:

- public read task,
- browser session task,
- desktop app task,
- external CLI passthrough task.

If the task does not fit any supported `opencli` shape, say so clearly.

### 2. Check whether `opencli` exists

Run:

```bash
command -v opencli
```

If missing, explain that `opencli` must be installed locally first.

Recommended install:

```bash
npm install -g @jackwener/opencli
```

After installation, continue with readiness checks instead of jumping straight into the user task.

### 3. Run readiness check

Run:

```bash
opencli doctor
```

Use this as the main readiness gate.

If `doctor` fails, do not proceed to the real task yet. Diagnose the failure first.

### 4. Apply task-specific prerequisites

For browser session tasks:

- Chrome must be running.
- The user must already be logged into the target website in Chrome.
- The OpenCLI Browser Bridge extension must be installed and enabled.

For desktop app tasks:

- The target app must already be installed.
- The target app should be open before execution when appropriate.
- Do not assume desktop adapters are universally cross-platform; verify command availability first.

For external CLI passthrough tasks:

- Verify the target command exists before assuming passthrough is ready.
- Example:

```bash
command -v gh
```

- `opencli` documentation says some passthrough commands may attempt auto-install of missing CLIs.
- Do not rely on that behavior silently.
- If the underlying CLI is missing, explain it and ask for explicit user confirmation before any install path.

### 5. Discover supported commands

When support is uncertain, run:

```bash
opencli list
```

Prefer:

```bash
opencli list -f yaml
```

when structured inspection is easier.

Only use commands that can be confirmed from the installed `opencli` command list.

## Safe Execution Rules

- Prefer read-only commands before write commands.
- For writes, posting, deleting, following, publishing, or account-affecting actions, ask for explicit confirmation first.
- If the task is exploratory, start with a lightweight read command or status command before a more invasive action.
- If the user asks for an unsupported site or command, say it is unsupported instead of improvising.
- If `opencli doctor` or command output indicates missing login, missing extension, or missing app state, stop and guide the user.
- Do not bury setup details. Explain the missing prerequisite directly.

## Browser Setup Guidance

When browser setup is missing, guide the user through this exact idea:

1. Install the latest OpenCLI browser extension from the upstream releases page.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Load the unpacked extension or the unzipped release bundle.
5. Make sure Chrome stays running.
6. Log into the target site in Chrome.
7. Re-run:

```bash
opencli doctor
```

Do not claim browser commands are safe to run before these checks pass.

## Privacy And Trust Guidance

When a user is sensitive to privacy or account risk, explain these points clearly:

- `opencli` reuses the user's existing Chrome login state.
- Its browser bridge communicates through a local daemon on `localhost`.
- The extension requests browser permissions such as debugger, tabs, cookies, activeTab, and alarms.
- The skill should surface this clearly before high-trust tasks.

Do not frame this as "no-risk magic". Frame it as a local tool with explicit browser permissions and explicit account reuse.

## Recommended Command Patterns

Use patterns like these:

```bash
opencli list
opencli doctor
opencli hackernews top --limit 5
opencli reddit search "AI"
opencli youtube transcript "<url>"
opencli bilibili hot --limit 5
opencli gh pr list --limit 5
```

If the user wants a specific command and you are unsure whether it exists, check `opencli list` first.

## Troubleshooting

### `opencli` not found

- Explain that the local CLI is not installed.
- Guide the user through installation.
- Re-check with `command -v opencli`.

### `doctor` reports extension or daemon problems

- Do not continue to the real task.
- Guide the user through extension setup and rerun `opencli doctor`.

### Browser command returns empty data or unauthorized behavior

- Explain that the most likely cause is missing or expired Chrome login state.
- Ask the user to log into the target site in Chrome and try again.

### Desktop command fails

- Confirm the target app is actually supported.
- Confirm the app is open.
- Confirm the command exists in `opencli list`.

### External CLI passthrough may install another CLI

- Explain that this may modify the local machine.
- Ask for explicit confirmation before proceeding.

## Success Criteria

The skill is working correctly when:

- the user understands what `opencli` is being used for,
- missing setup is identified before task execution,
- readiness is checked with `opencli doctor`,
- the user is guided through any required setup,
- supported commands are confirmed via `opencli list` when needed,
- and the final task runs only after the environment is truly ready.
