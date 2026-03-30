# v0.14.299-cron-agent-tool-action-alignment

## 迭代完成说明

- 将 `packages/nextclaw-core/src/agent/tools/cron.ts` 从“仅新增 cron”的单一路径，对齐为动作式协议，支持 `add`、`list`、`remove`。
- `cron remove` 现已支持 `jobId`、`job_id`、`id` 三种任务标识写法；`cron add` 兼容 `every_seconds`、`cron_expr`、`account_id` 等旧别名。
- 更新 `packages/nextclaw-core/src/agent/skills/cron/SKILL.md`，让 skill 示例与真实实现一致，避免 AI 继续按文档正确调用、却被底层错误解释为 `add`。
- 新增 `packages/nextclaw-core/src/agent/tools/cron.test.ts`，覆盖 `add/list/remove` 与兼容别名契约。
- 顺手将 `packages/nextclaw-core/src/cron/service.ts` 的 `reloadFromStore` 调整为箭头字段，满足当前仓库治理规则。

## 测试/验证/验收方式

- 单测：`PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-core exec vitest run src/agent/tools/cron.test.ts`
- 类型检查：`PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-core tsc`
- 冒烟：
  `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-core exec tsx -e 'import { CronTool } from "./src/agent/tools/cron.ts"; const calls: string[] = []; const tool = new CronTool({ addJob(input){ calls.push(\`add:${input.name}\`); return { id: "job-smoke", name: input.name }; }, listJobs(){ return [{ id: "job-smoke", name: "demo" }]; }, removeJob(id){ calls.push(\`remove:${id}\`); return true; } } as any); void (async () => { const removed = await tool.execute({ action: "remove", jobId: "job-smoke" }); const listed = await tool.execute({ action: "list" }); console.log(removed); console.log(listed); console.log(JSON.stringify(calls)); })();'`
- 可维护性守卫：`PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`

## 发布/部署方式

- 本次改动属于 `@nextclaw/core` 的 agent tool 与内部 skill 对齐，不需要单独部署数据库或执行 migration。
- 按正常包/应用发布链路纳入下一次构建与发布即可；若需要对外发版，确保包含 `@nextclaw/core` 的构建产物与技能文件同步更新。

## 用户/产品视角的验收步骤

1. 在 NextClaw 中创建一个 cron 任务，记下返回的 `jobId`。
2. 让 AI 调用 `cron(action="list")`，确认返回结果中能看到该任务。
3. 让 AI 调用 `cron(action="remove", jobId="<上一步 jobId>")`，确认返回 `{"removed":true,...}`。
4. 再次调用 `cron(action="list")`，确认该任务已不在列表中。
5. 用旧写法 `cron(action="remove", job_id="<jobId>")` 再验证一次，确认兼容别名仍可删除。
