# v0.14.228-codex-supported-models-wildcard

## 迭代完成说明

- 调整 Codex session type 的模型约束语义：
  - 默认不再对外发布 `supportedModels` 白名单，Codex 会话直接显示全量模型目录。
  - 仅当插件显式配置具体 `supportedModels` 列表时，才对前端模型选择器生效。
  - 新增裸 `*` 语义，`supportedModels: ["*"]` 等价于“不限制任何模型”。
- 将 `supportedModels` 正式补充到 Codex 插件配置 schema 与 UI hints 中，并标记为高级可选配置。
- 更新回归测试，覆盖默认无白名单、显式白名单、以及 `*` 通配语义。

## 测试/验证/验收方式

- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw test -- --run src/cli/commands/ncp/create-ui-ncp-agent.test.ts`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- 可维护性自检：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-session-type.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/openclaw.plugin.json packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.test.ts`

## 发布/部署方式

- 若需要让已安装环境获得该行为，按常规发布流程发布至少以下包：
  - `@nextclaw/nextclaw`
  - `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk`
- 发布后重启或重载 NextClaw 服务，使新的 session type 描述生效。

## 用户/产品视角的验收步骤

1. 启动 NextClaw 并进入聊天页。
2. 新建一个 `Codex` 会话。
3. 确认模型选择器不再只显示受限白名单，而是显示当前全局模型目录中的可选模型。
4. 若在 Codex 插件高级配置中显式设置 `supportedModels` 为具体列表，确认会话只显示该列表中的模型。
5. 再将 `supportedModels` 设为 `["*"]`，确认模型选择器重新恢复为任意模型可选。
