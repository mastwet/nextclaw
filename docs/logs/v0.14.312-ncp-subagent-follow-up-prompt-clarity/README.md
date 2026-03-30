# 迭代完成说明

- 强化 subagent 完成后触发父 agent follow-up 的 hidden system prompt。
- 新提示明确声明这不是新的用户消息，而是当前会话里父 agent 自己先前发起的 subagent 刚刚完成。
- 新提示明确给出 delegated task、subagent outcome、subagent result，并直接要求父 agent 基于该结果继续原任务。

# 测试 / 验证 / 验收方式

- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.subagent-completion.test.ts`（`packages/nextclaw`）
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter nextclaw exec tsc -p tsconfig.json --noEmit`

# 发布 / 部署方式

- 本次未执行发布。
- 后续按既有前端 / NCP 发布流程正常发布即可，无需额外 migration。

# 用户 / 产品视角的验收步骤

1. 在 NCP chat 中触发一次 `spawn`。
2. 等待 subagent 完成，观察父 agent 是否在不刷新页面的情况下继续回复。
3. 重点确认父 agent 的续写是否明显理解“刚刚完成的是它自己发起的 subagent”，而不是把它当成模糊的新输入。
4. 若 subagent 已经完成用户请求，父 agent 应直接给用户结论；若还没完成，应继续推进后续动作。
