# v0.14.297-cron-store-hot-reload

## 迭代完成说明（改了什么）

- 在 `CronService` 新增 `reloadFromStore()`，用于在不重启进程的情况下重新加载 `cron/jobs.json`、重算 next run 并重置定时器。
- 在 service 启动链路新增 cron store 文件监听：监听 `~/.nextclaw/cron/jobs.json` 的 `add/change/unlink`，触发 `cron.reloadFromStore()`。
- 保持现有 `config.json` watcher 机制不变，仅补齐 cron 这条热同步路径，避免 CLI 本地回退写文件后服务内存态滞后。

## 测试/验证/验收方式

- `pnpm -C packages/nextclaw-core lint`
- `pnpm -C packages/nextclaw-core tsc`
- `pnpm -C packages/nextclaw lint`
- `pnpm -C packages/nextclaw tsc`
- `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-core/src/cron/service.ts packages/nextclaw/src/cli/commands/service-startup-support.ts packages/nextclaw/src/cli/commands/service.ts`
- 冒烟脚本（本地）：构造临时 `jobs.json`，调用 `CronService.reloadFromStore()` 后确认 `listJobs(true)` 与文件内容一致。

## 发布/部署方式

- 本次改动涉及 `@nextclaw/core` 与 `nextclaw`，按既有流程执行：
  - `pnpm changeset`
  - `pnpm release:version`
  - `pnpm release:publish`
- 若仅本地验证，重启 `nextclaw serve` 后即可生效。

## 用户/产品视角的验收步骤

- 启动本地 `nextclaw serve` 并打开 cron 页面。
- 在另一个终端通过 CLI 删除某个任务（包括可能触发本地回退写 `jobs.json` 的场景）。
- 不重启服务，直接刷新 cron 页面或调用 `/api/cron?all=1`。
- 预期：任务立即消失，不再出现“重启后才消失”。
