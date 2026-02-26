# 2026-02-26 v0.0.1-ui-theme-switcher

## 迭代完成说明（改了什么）

- 新增 UI 主题机制，保留两套主题并支持动态切换：
- `warm`（当前暖色方案）
- `cool`（保留冷色方案）
- 新增主题状态与持久化：
- `packages/nextclaw-ui/src/lib/theme.ts`
- `packages/nextclaw-ui/src/components/providers/ThemeProvider.tsx`
- 在 `main.tsx` 注入 `ThemeProvider`，启动时自动应用已保存主题。
- 主题切换入口接入侧边栏（单行展示，与现有“语言”行保持一致）：
- `packages/nextclaw-ui/src/components/layout/Sidebar.tsx`
- 新增 i18n 文案键：
- `theme`、`themeWarm`、`themeCool`
- `packages/nextclaw-ui/src/lib/i18n.ts`
- 扩展设计系统变量，新增 `:root[data-theme="cool"]` 变量覆盖：
- `packages/nextclaw-ui/src/styles/design-system.css`

## 测试 / 验证 / 验收方式

- 全量验证（按规则）：
- `PATH=/opt/homebrew/bin:$PATH pnpm build`
- `PATH=/opt/homebrew/bin:$PATH pnpm lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm tsc`
- 冒烟验证（用户可见变更）：
- `rg -n -o "nextclaw\\.ui\\.theme" packages/nextclaw-ui/dist/assets/index-*.js`
- `rg -n -o ":root\\[data-theme=cool\\]" packages/nextclaw-ui/dist/assets/index-*.css`
- 验收点：
- 构建成功，lint/tsc 无阻断错误（存在既有 warning，不影响本次功能）。
- 前端产物包含主题持久化 key（`nextclaw.ui.theme`）。
- 前端产物包含 cool 主题变量块（`:root[data-theme=cool]`）。

## 发布 / 部署方式

- 本次为前端 UI 行为改动，无后端/数据库变更：
- 远程 migration：不适用。
- 前端发布：
- `PATH=/opt/homebrew/bin:$PATH pnpm release:frontend`
- 如只部署内置 UI（非 npm 发布）：
- `PATH=/opt/homebrew/bin:$PATH pnpm deploy:landing`（不适用本 UI 包）

## 用户 / 产品视角的验收步骤

1. 启动 `pnpm dev start` 并打开 UI。
2. 在侧边栏底部找到 `Theme` 下拉，确认可选 `Warm` 与 `Cool`。
3. 切换主题后，页面配色即时变化（无需手动刷新）。
4. 刷新页面，确认主题选择被持久化（仍保持上次选中的主题）。
5. 切换语言后再进入页面，确认主题选择仍保持不变。
