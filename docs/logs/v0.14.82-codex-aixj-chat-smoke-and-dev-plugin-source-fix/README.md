# v0.14.82-codex-aixj-chat-smoke-and-dev-plugin-source-fix

## 迭代完成说明

- 修复 `nextclaw dev:build serve` 源码运行时对 first-party plugin 的解析逻辑：当未显式设置 `NEXTCLAW_DEV_FIRST_PARTY_PLUGIN_DIR` 时，CLI 现在会自动回退到仓库内 `packages/extensions`，避免 dev 模式继续优先吃到用户 home 下已安装但版本过旧的插件包。
- 这次问题的直接表现是 codex 会话加载到旧版 `nextclaw-ncp-runtime-plugin-codex-sdk` 后触发 `skillsLoader.loadSkillsForContext is not a function`，导致对话链路无法产出真实 assistant 内容。
- 补充了 dev first-party plugin 目录推断测试，覆盖“源码运行且没有环境变量覆盖”时应命中仓库本地扩展目录。
- 使用可用的 aixj 路由模型完成 codex 会话真实冒烟，确认服务端可以返回实际 assistant 文本。

## 测试/验证/验收方式

- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw test -- --run src/cli/commands/dev-first-party-plugin-load-paths.test.ts`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- 静态检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw lint`
  - 结果：通过；仅存在仓库历史 warning，无新增 error。
- codex + aixj 实际冒烟：
  - `unset NEXTCLAW_HOME`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw dev:build serve --ui-port 18796`
  - `curl http://127.0.0.1:18796/api/ncp/session-types`
  - `PATH=/opt/homebrew/bin:$PATH pnpm smoke:ncp-chat -- --session-type codex --model custom-1/gpt-5.4 --port 18796 --timeout-ms 180000`
- 冒烟验收结果：
  - `session-types` 返回包含 `codex`
  - `smoke:ncp-chat` 输出 `Result: PASS`
  - assistant 文本为 `OK`

## 发布/部署方式

- 按项目既有 NPM 发版流程执行：[NPM Package Release Process](../../../workflows/npm-release-process.md)
- 本轮发版使用隔离的 clean git worktree，只携带本次修复文件、迭代 README 与 changeset，避免把主工作区里的无关未提交改动一并发布。
- 发版命令：
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:version`
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`
- 发布后校验：
  - `PATH=/opt/homebrew/bin:$PATH npm view nextclaw version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/openclaw-compat version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/server version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/mcp version`

## 用户/产品视角的验收步骤

1. 在本地已有可用 provider 配置的前提下，执行 `nextclaw serve` 或 `nextclaw dev:build serve` 启动服务。
2. 调用 `GET /api/ncp/session-types`，确认返回列表中有 `codex`。
3. 发起一个 `codex` session，并选择 aixj 可用模型。
4. 发送一条最小消息，例如 “Reply with OK only”。
5. 确认服务端返回真实 assistant 内容，而不是 `skillsLoader.loadSkillsForContext is not a function` 一类运行时错误。
