# v0.14.59-mcp-marketplace-intro-i18n

## 迭代完成说明

- 对齐 `skills/plugins marketplace` 的国际化展示策略，把 marketplace 条目的介绍文案选择逻辑抽为共享模块，避免在 MCP 页面单独维护一套 locale fallback。
- MCP marketplace 页面改为根据当前语言优先展示 `summaryI18n`，并在无 catalog summary 时回退到已安装记录里的本地描述字段。
- MCP 文档弹窗页补上本地化摘要展示，避免打开内容时只看到英文标题和原始内容，看不到当前语言下的介绍。
- 新增 MCP marketplace 页面测试，覆盖中文语言下优先使用 `summaryI18n.zh` 的场景。

## 测试/验证/验收方式

- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- src/components/marketplace/mcp/McpMarketplacePage.test.tsx`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
- 可维护性自检：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/marketplace/MarketplacePage.tsx packages/nextclaw-ui/src/components/marketplace/marketplace-localization.ts packages/nextclaw-ui/src/components/marketplace/mcp/McpMarketplacePage.tsx packages/nextclaw-ui/src/components/marketplace/mcp/McpMarketplacePage.test.tsx`
  - 结果：`Errors: 0`；`MarketplacePage.tsx` 仍有历史 file-budget warning，但本次比之前减少 50 行。

## 发布/部署方式

- 本次为前端与打包产物更新，不涉及后端、数据库或 worker 发布。
- 交付方式：
  - 更新 `@nextclaw/ui` 源码
  - 重新执行 `packages/nextclaw` build，同步刷新 `packages/nextclaw/ui-dist`
- 如需后续正式发布，可沿现有前端/UI-only 发布流程执行 version/publish。

## 用户/产品视角的验收步骤

1. 启动本地开发环境并把界面语言切到中文。
2. 进入 Marketplace 的 MCP 页面。
3. 确认 `Chrome DevTools MCP` 这类已提供中文介绍的条目，卡片摘要优先显示中文，而不是固定英文。
4. 点击条目打开文档页，确认标题下方的介绍摘要同样显示当前语言对应的文本。
5. 再切回英文，确认相同条目会回退显示英文介绍，行为与 `skills/plugins marketplace` 保持一致。
