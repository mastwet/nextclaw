# Nextclaw UI Chat Phase 3 Plan

## Goal
- Push `packages/nextclaw-ui/src/components/chat` to a clean package-candidate baseline.
- Focus only on necessary work for reuse, stability, and future extraction.
- Avoid over-customization, plugin systems, or large theming work.

## Scope
- Separate reusable exports from Nextclaw host-layer exports.
- Tighten the default-skin primitive boundary used by chat UI.
- Add the minimum list/menu accessibility and keyboard baseline needed for reuse.
- Keep current product behavior and visuals as stable as possible.

## Required Changes
1. Split chat exports into:
   - reusable/core layer: `ui`, `hooks`, `utils`, `view-models`
   - nextclaw layer: `containers` and Nextclaw-facing adapters
2. Stop exposing host-layer containers from the reusable chat entry.
3. Move direct chat UI primitive dependencies behind the chat primitive adapter layer, including `Input`.
4. Add minimum accessible list/menu semantics and keyboard behavior to reusable interactive pieces:
   - slash menu
   - skill picker
5. Keep message part contracts stable and avoid widening them in this phase.
6. Keep web-only DOM utilities explicit and local to the chat module.

## Non-Goals
- No standalone npm package in this phase.
- No broad theming system.
- No plugin/render-prop expansion.
- No sidebar or session-list refactor.
- No protocol or runtime data model redesign.

## Acceptance
- Reusable chat entry no longer exports containers.
- Nextclaw host exports are available from a separate entry.
- Chat UI uses chat-owned primitive adapters for `Input/Popover/Select/Tooltip`.
- Slash menu and skill picker both provide minimum ARIA roles and keyboard navigation.
- `pnpm -C packages/nextclaw-ui tsc`
- Affected chat tests pass.
- `pnpm -C packages/nextclaw-ui build`
