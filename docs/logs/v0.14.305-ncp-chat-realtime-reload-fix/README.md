# 迭代完成说明

- 修复 NCP 聊天页在本地 run 进行期间收到 realtime session 事件后，错误地在 run 结束后再次 `reloadSeed()` 的问题。
- 将当前页的 realtime reload 策略收敛为：
  - `hydrating` 中：延期 reload
  - 当前页本地 `running/sending` 中：跳过 reload
  - 空闲态：立即 reload
- 这样可以避免把运行中的瞬时 `running` summary 在 run 结束后重新 hydrate 回当前页，导致前端额外出现一条“Agent 正在回复”气泡，以及发送按钮仍保持进行中状态。
- 新增纯函数测试，锁定这个策略回归点。

# 测试/验证/验收方式

- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui exec vitest run src/components/chat/ncp/ncp-chat-realtime-reload.test.ts src/components/chat/useHydratedNcpAgent.test.tsx`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui exec tsc -p tsconfig.json --noEmit`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`

# 发布/部署方式

- 本次仅完成代码修复与本地验证，未执行发布。
- 如需发布，按既有前端/NPM 发布流程走版本提升、发布校验与发布闭环。

# 用户/产品视角的验收步骤

1. 在 NCP 聊天页发起一个会触发 subagent completion 的任务。
2. 观察主 agent 正常输出最终回复。
3. 确认最终回复结束后，不会再在底部额外出现一条“Agent 正在回复”气泡。
4. 确认发送按钮和整体会话状态会恢复为空闲态，不再保持进行中。
5. 刷新页面后，消息历史仍然完整，且不会被重新标记成运行中。
