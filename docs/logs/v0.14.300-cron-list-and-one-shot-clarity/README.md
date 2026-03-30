# v0.14.300-cron-list-and-one-shot-clarity

## 迭代完成说明

- 对齐 cron 列表语义：CLI、agent `cron` tool、server `/api/cron` 默认都返回全部任务，包含已禁用任务；仅在显式传入 `enabledOnly` 时才收窄为只看启用任务。
- 明确任务状态与动作语义：CLI 列表输出新增 `[enabled]` / `[disabled]` 状态标签；agent `cron` tool 新增 `enable` / `disable` 动作；CLI 新增显式 `cron disable <jobId>` 子命令，和 `remove` 彻底区分。
- 强化一次性任务与指令表达：补充 `cron` skill 与 `cron` tool 参数说明，明确 `at` 用于一次性任务，`every` / `cron` 仅用于周期任务；同时明确 `message` 应填写“到点后要执行的指令”，而不是只写最终外发文案。
- 增加自动化验证：新增 server 路由测试，补充 CLI 输出测试与 agent `cron` tool 测试，覆盖默认全量列表、`enabledOnly`、`enable/disable/remove`、以及 `at` 一次性调度。

## 测试/验证/验收方式

- 定向单测
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-core exec vitest run src/agent/tools/cron.test.ts`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw exec vitest run src/cli/commands/cron/cron-job.utils.test.ts`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-server exec vitest run src/ui/router.cron.test.ts`
- 类型检查
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-core tsc`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw tsc`
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-server tsc`
- 冒烟验证
  - CLI 隔离 `NEXTCLAW_HOME` 下执行：
    - `nextclaw cron add ... -e 60`
    - `nextclaw cron add ... --at 2035-01-01T10:05:00+08:00`
    - `nextclaw cron disable <jobId>`
    - `nextclaw cron list`
    - `nextclaw cron list --enabled-only`
    - `nextclaw cron remove <jobId>`
  - 观察点：
    - 默认 `cron list` 能看到 disabled 任务并显示状态标签
    - `--enabled-only` 会排除 disabled 任务
    - `disable` 不删除任务，`remove` 才会彻底移除
    - `--at` 任务会以单次时间点落库和展示
  - agent 侧用真实 `CronService + CronTool` 冒烟，确认：
    - 默认 `list` 返回 disabled
    - `enabledOnly: true` 仅返回 enabled
    - `disable` 后任务仍存在
    - `remove` 后任务消失
- 可维护性与治理
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：通过；仅保留仓库既有目录预算/大文件预警，无新增阻塞项。

## 发布/部署方式

- 本次为 NPM 包发布，无远程 migration、无服务端部署步骤。
- 按项目标准发布流程执行：
  - 新建 changeset，覆盖 `@nextclaw/core`、`@nextclaw/server`、`nextclaw`
  - `pnpm release:version`
  - `pnpm release:publish`
- 若在隔离 worktree 外发布，需确保使用项目根 `.npmrc` 凭据。

## 用户/产品视角的验收步骤

1. 在 UI 中查看 cron 列表，确认启用与禁用任务都能出现，且状态清晰。
2. 在 CLI 中执行 `nextclaw cron list`，确认结果与 UI 一致，并能看到 `[enabled]` / `[disabled]`。
3. 执行 `nextclaw cron disable <jobId>` 后重新 `list`，确认任务仍存在但状态变为 disabled。
4. 执行 `nextclaw cron remove <jobId>` 后重新 `list`，确认该任务被彻底删除。
5. 让 AI 创建一个“一次性”任务，例如“5 分钟后给微信发一条消息”，确认其使用单次 `at` 调度而不是 `every` 周期任务。
6. 让 AI 创建一个“渠道发送”任务，确认写入的是执行指令，例如“到时给当前微信会话发送这条文案”，而不是只把文案正文裸写进 `message`。
