# 迭代完成说明

- 修复 NCP 子 agent 完成后，父 agent 没有再次被触发继续输出的问题。
- completion 现在分成两步：
  - 先写入一条用户可见的 `service` completion 卡片，保留可见性与历史留痕。
  - 再在 session 进入 idle 后，发起一轮隐藏的 follow-up run，把 completion 结果作为内部 `system` 驱动消息喂给父 agent，继续生成后续 assistant 输出。
- 为避免把内部驱动消息污染聊天历史，引入了隐藏消息元数据约定；隐藏消息会参与当前轮建模，但不会被持久化成用户可见消息。
- 修正 `NextclawNcpContextBuilder` 当前轮角色处理，不再把所有当前轮输入强制写成 `user`，而是允许 `system` follow-up 保持其原始角色语义。

# 测试/验证/验收方式

- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ncp exec tsc -p tsconfig.json --noEmit`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ncp-agent-runtime exec tsc -p tsconfig.json --noEmit`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ncp-toolkit exec tsc -p tsconfig.json --noEmit`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui exec tsc -p tsconfig.json --noEmit`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter nextclaw exec tsc -p tsconfig.json --noEmit`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter nextclaw exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.subagent-completion.test.ts`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`

# 发布/部署方式

- 本次仅完成代码修复与本地验证，未执行发布。
- 如需发布，按既有 NPM / UI 发布流程执行版本提升、发布检查、发布与发布后冒烟。

# 用户/产品视角的验收步骤

1. 在 NCP 聊天页发起一个会触发 subagent 的任务。
2. 观察主 agent 先正常启动 subagent。
3. 等 subagent 完成后，确认聊天历史里会出现一条可见的 completion 卡片。
4. 随后确认父 agent 会基于该 completion 再次继续输出 assistant 消息，而不是停在“子 agent 完成但主 agent 不动”。
5. 刷新页面后，确认历史里没有额外暴露内部 follow-up 的隐藏 system 消息，只保留用户应看到的 completion 卡片和父 agent 后续输出。
