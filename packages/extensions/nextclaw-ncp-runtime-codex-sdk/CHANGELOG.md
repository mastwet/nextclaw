# @nextclaw/nextclaw-ncp-runtime-codex-sdk

## 0.1.5

### Patch Changes

- Updated dependencies
  - @nextclaw/ncp@0.4.0

## 0.1.4

### Patch Changes

- Updated dependencies
  - @nextclaw/ncp@0.3.3

## 0.1.3

### Patch Changes

- 004b779: Stop surfacing Codex SDK non-fatal model metadata warnings as user-visible tool/error messages in codex sessions for OpenAI-compatible models such as DashScope `qwen3-coder-next`.

## 0.1.2

### Patch Changes

- Republish all public workspace packages with pnpm publish guards so released manifests no longer retain workspace:\* dependencies and future npm publish misuse is blocked before release.
- Updated dependencies
  - @nextclaw/ncp@0.3.2

## 0.1.1

### Patch Changes

- Republish the NCP-linked package set so published consumers resolve the
  latest NCP protocol/runtime exports used by the current NextClaw CLI build.
- Updated dependencies
  - @nextclaw/ncp@0.3.1
