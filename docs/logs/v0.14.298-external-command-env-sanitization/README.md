# v0.14.298 External Command Env Sanitization

## 迭代完成说明

- 修复 `pnpm dev start` 场景下 AI/运行时执行外部命令时继承 `NODE_OPTIONS=--conditions=development` 的问题。
- 新增可复用的外部子进程环境清洗工具：在真正调用系统外部命令前，统一移除 `NODE_OPTIONS` 中的 `--conditions=development`，避免开发态条件泄漏到全局安装的 `nextclaw`、`npm`、浏览器启动器等外部进程。
- 将该清洗逻辑接入以下入口：
  - `@nextclaw/core` 的 `ExecTool`
  - `@nextclaw/openclaw-compat` 的插件依赖安装命令
  - `nextclaw` 的自更新命令
  - `nextclaw` 的浏览器唤起命令
- 补充 `ExecTool` / 环境清洗单测，覆盖“仅移除 development 条件、保留其他 `NODE_OPTIONS`”的回归场景。

## 测试/验证/验收方式

- 单测：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core test -- --run src/agent/tools/shell.test.ts`
- 类型检查：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core tsc`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-openclaw-compat tsc`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- 构建验证：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core build`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-openclaw-compat build`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
- 烟雾验证：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH TMP_HOME=$(mktemp -d /tmp/nextclaw-exec-smoke.XXXXXX) NEXTCLAW_HOME="$TMP_HOME" NODE_OPTIONS='--conditions=development' pnpm -C packages/nextclaw-core exec tsx -e '(async () => { const { ExecTool } = await import("./src/agent/tools/shell.ts"); const tool = new ExecTool(); const result = await tool.execute({ command: "nextclaw cron list" }); console.log(result); })();'`
  - 结果：成功返回 `No scheduled jobs.`，未再出现 `@nextclaw/core/src/index.ts` 模块缺失错误。
- 仓库治理守卫：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：本次改动相关验证通过，但守卫因仓库内既有/并行修改的 `packages/nextclaw-core/src/agent/tools/cron.ts`、`packages/nextclaw-core/src/cron/service.ts` 的 class-method 治理规则失败，非本次新增修复逻辑导致。

## 发布/部署方式

- 本次未执行正式发布。
- 若需对外发布，按既有流程执行：
  - `pnpm release:version`
  - `pnpm release:publish`
- 发布前建议在真实开发态复验一轮：
  - 启动 `pnpm dev start`
  - 通过 AI/技能触发一次 `nextclaw cron list` 或其他外部 CLI 命令
  - 确认不会再命中 `@nextclaw/core/src/index.ts` 的模块缺失报错

## 用户/产品视角的验收步骤

1. 在仓库根目录启动 `pnpm dev start`。
2. 在会触发 AI 执行 shell 命令的场景里，让其运行 `nextclaw cron list`。
3. 确认命令不再报 `Cannot find module ... @nextclaw/core/src/index.ts`。
4. 如有需要，再继续执行 `nextclaw cron remove <jobId>` 等外部命令，确认行为恢复正常。
