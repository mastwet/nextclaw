# 迭代完成说明

- 修复 NCP 子 agent completion follow-up 继续唤醒父 agent 时，上游模型收到非法 `service` role 导致 400 的问题。
- 根因是 NCP 会话里用于用户可见 completion 卡片的 `service` 消息，在喂模型的 legacy history 适配层没有被归一化，直接进入了 provider 输入。
- 现在在“喂模型”这条链路上，`service` 会被归一化为 `system`；NCP 持久化与前端展示层仍保留 `service` 自身语义，不影响用户可见卡片。
- 补充上下文构建测试与 subagent completion 集成测试，覆盖：
  - `service` 历史消息不会继续透传到上游
  - completion 后父 agent 仍会继续输出

# 测试/验证/验收方式

- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter nextclaw exec vitest run src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts src/cli/commands/ncp/create-ui-ncp-agent.subagent-completion.test.ts`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter nextclaw exec tsc -p tsconfig.json --noEmit`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`

# 发布/部署方式

- 本次仅完成代码修复与本地验证，未执行发布。
- 如需发布，按既有 NPM / UI 发布流程执行版本提升、发布检查、发布与发布后冒烟。

# 用户/产品视角的验收步骤

1. 在前端发起一个会触发 subagent 的任务。
2. 等 subagent 完成，确认会出现 completion 卡片。
3. 确认此时父 agent 会继续输出，而不是停住。
4. 确认服务端不再报 `service is not one of ['system', 'assistant', 'user', 'tool', 'function']` 之类的 400。
