# v0.13.74-ncp-toolkit-split

## 迭代完成说明（改了什么）
- 新增独立包 `packages/nextclaw-ncp-toolkit`，用于承载基于协议的实现层。
- 将 `DefaultNcpAgentConversationStateManager` 实现与单元测试从 `@nextclaw/ncp` 迁移到 `@nextclaw/ncp-toolkit`。
- `@nextclaw/ncp` 回归协议/契约层：`agent-conversation-state-manager.ts` 仅保留 `NcpAgentConversationStateManager` interface。
- 更新导出：
  - `@nextclaw/ncp` 仅导出接口类型。
  - `@nextclaw/ncp-toolkit` 导出默认实现类。
- 更新根工作区脚本 `build/lint/tsc`，纳入 `packages/nextclaw-ncp-toolkit`。
- 更新依赖与锁文件：`@nextclaw/ncp-toolkit` 依赖 `@nextclaw/ncp`（`workspace:*`）。

## 测试/验证/验收方式
- `pnpm -C packages/nextclaw-ncp-toolkit test`
- `pnpm -C packages/nextclaw-ncp-toolkit lint`
- `pnpm -C packages/nextclaw-ncp-toolkit tsc`
- `pnpm -C packages/nextclaw-ncp-toolkit build`
- `pnpm -C packages/nextclaw-ncp lint`
- `pnpm -C packages/nextclaw-ncp tsc`
- `pnpm -C packages/nextclaw-ncp build`
- 结果：以上命令全部通过。

## 发布/部署方式
- 本次为包结构与代码归属调整，不涉及运行时部署。
- 后续发布按仓库标准流程执行 `changeset -> version -> publish`。

## 用户/产品视角的验收步骤
1. 在消费端保持 `@nextclaw/ncp` 用于协议类型和接口。
2. 从 `@nextclaw/ncp-toolkit` 引入 `DefaultNcpAgentConversationStateManager` 并构造实例。
3. 发送 `message.text-* / message.tool-call-* / message.completed` 事件，确认状态聚合行为与拆分前一致。
4. 发送 `message.failed / endpoint.error` 事件，确认错误态更新正常。
