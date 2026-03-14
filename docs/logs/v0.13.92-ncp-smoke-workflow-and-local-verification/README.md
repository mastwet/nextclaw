# v0.13.92-ncp-smoke-workflow-and-local-verification

## 迭代完成说明（改了什么）
- 新增 GitHub Actions 工作流 [`ncp-smoke.yml`](../../../.github/workflows/ncp-smoke.yml)：
  - 触发条件：`pull_request`、`push`（`master/main`）和 `workflow_dispatch`。
  - 触发范围：`@nextclaw/ncp`、`@nextclaw/ncp-agent-runtime`、`@nextclaw/ncp-http-agent-server`、`@nextclaw/ncp-http-agent-client` 相关路径及锁文件/根脚本变更。
  - 校验项：受影响包 `lint`、`tsc`、`build`、测试（server/client）以及 runtime 端到端冒烟（`run.started -> message.completed -> run.finished`）。
- 本次未修改用户并行进行中的业务实现文件，仅新增 workflow 与迭代日志。

## 测试/验证/验收方式
- 本地按 workflow 同等命令完整执行（作为 workflow 可行性预验证）：
  - `pnpm -C packages/nextclaw-ncp lint`
  - `pnpm -C packages/nextclaw-ncp-agent-runtime lint`
  - `pnpm -C packages/nextclaw-ncp-http-agent-server lint`
  - `pnpm -C packages/nextclaw-ncp-http-agent-client lint`
  - `pnpm -C packages/nextclaw-ncp tsc`
  - `pnpm -C packages/nextclaw-ncp-agent-runtime tsc`
  - `pnpm -C packages/nextclaw-ncp-http-agent-server tsc`
  - `pnpm -C packages/nextclaw-ncp-http-agent-client tsc`
  - `pnpm -C packages/nextclaw-ncp build`
  - `pnpm -C packages/nextclaw-ncp-agent-runtime build`
  - `pnpm -C packages/nextclaw-ncp-http-agent-server build`
  - `pnpm -C packages/nextclaw-ncp-http-agent-client build`
  - `pnpm -C packages/nextclaw-ncp-http-agent-server test`
  - `pnpm -C packages/nextclaw-ncp-http-agent-client test`
  - `node --input-type=module <<'EOF' ... EOF`（与 workflow 一致的 runtime 冒烟脚本）
- 验证通过标准：
  - 全部命令退出码为 `0`
  - runtime 冒烟日志包含 `ncp smoke passed`

## 发布/部署方式
- 本次改动为 CI workflow 与文档，不涉及线上运行时发布。
- 合并后自动生效于 GitHub Actions，可通过以下方式触发：
  - 提交触发：修改匹配路径的 PR/push
  - 手动触发：`Actions -> ncp-smoke -> Run workflow`

## 用户/产品视角的验收步骤
1. 在 GitHub 仓库进入 `Actions` 页面，找到 `ncp-smoke` workflow。
2. 点击 `Run workflow` 手动触发，或提交一条 NCP 相关变更触发自动运行。
3. 观察执行日志应依次通过 `lint`、`tsc`、`build`、`test`、`Runtime smoke`。
4. 最终状态为 `green`，且 `Runtime smoke` 阶段输出 `ncp smoke passed`。
