# NPM Package Release Process

Scope: publish npm packages in `packages/*` and `packages/extensions/*`.
This does NOT cover registry/console deployment.

## Prereqs
- npm auth for this repo should come from the project-root `.npmrc` (gitignored).
- If release commands run from an isolated worktree or a different cwd, set
  `NPM_CONFIG_USERCONFIG=/absolute/path/to/<repo>/.npmrc` so npm still reads the
  project-root credentials.

## Standard flow
1) Create changeset
```bash
pnpm changeset
```

2) Sync package READMEs (source of truth in `docs/npm-readmes`)
```bash
pnpm release:sync-readmes
pnpm release:check-readmes
```

3) Bump versions + changelogs
```bash
pnpm release:version
```

4) Publish
```bash
pnpm release:publish
```

Notes:
- `release:version` and `release:publish` automatically run README sync/check.
- `release:check:groups` now only gates the explicit release batch from pending changesets or freshly versioned packages.
- `pnpm release:report:health` prints leftover unpublished drift for repository hygiene, but it does not block the current batch release.
- `release:publish` should run `release:check` (build + lint + typecheck) before publishing.
- `release:publish` should create git tags automatically.
- Never run `npm publish` directly inside `packages/*`, `packages/extensions/*`, or `packages/ncp-packages/*`.
- In this pnpm workspace, direct `npm publish` keeps `workspace:*` in the published manifest and breaks downstream installs.
- If you need to publish a single package manually, use `pnpm publish` from that package directory, or the repo-root `pnpm release:publish` flow.

## UI-only shortcut

If only the frontend UI changed, use the one-command shortcut. It will create a changeset for
`@nextclaw/ui` + `nextclaw`, then run the standard version + publish steps.

```bash
pnpm release:frontend
```
