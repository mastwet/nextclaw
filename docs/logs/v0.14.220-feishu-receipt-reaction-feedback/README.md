# 2026-03-26 v0.14.220-feishu-receipt-reaction-feedback

## 迭代完成说明

- 保留 compat runtime bridge 对 `onReplyStart` 的修复，让飞书渠道在 runtime 正式处理消息前就能触发即时反馈。
- 飞书 reply dispatcher 不再在 `onReplyStart` 尝试创建 streaming card 占位态，而是立即走收到反馈链路。
- 飞书即时反馈从不稳定、用户侧不明显的 `Typing` reaction 改为可见的 `THUMBSUP` reaction。
- 收到反馈 reaction 在回复结束后不再自动移除，避免“闪一下就没了”的体验问题。
- 将 reaction 相关断言从大测试文件拆到单独测试文件，保持测试职责清晰并通过 maintainability guard。

## 测试/验证/验收方式

- 单测：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH /Users/peiwang/Projects/nextbot/node_modules/.pnpm/node_modules/.bin/vitest run packages/extensions/nextclaw-channel-plugin-feishu/src/reply-dispatcher.streaming-placeholder.test.ts packages/extensions/nextclaw-channel-plugin-feishu/src/reply-dispatcher.test.ts packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.test.ts`
- 类型检查：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-openclaw-compat tsc`
- 可维护性检查：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-channel-plugin-feishu/src/reply-dispatcher.ts packages/extensions/nextclaw-channel-plugin-feishu/src/typing.ts packages/extensions/nextclaw-channel-plugin-feishu/src/reply-dispatcher.streaming-placeholder.test.ts packages/extensions/nextclaw-channel-plugin-feishu/src/reply-dispatcher.test.ts packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.ts packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.test.ts packages/nextclaw-openclaw-compat/src/plugins/types.ts`

## 发布/部署方式

- 本次需要按项目 release 流程发布受影响包：`@nextclaw/channel-plugin-feishu`、`@nextclaw/openclaw-compat`、`@nextclaw/server`、`nextclaw`。
- 发布后在本地实例执行：
  - `nextclaw update`
  - `nextclaw restart`
- 若服务当前未运行，则改用 `nextclaw start` 拉起，再执行状态检查与飞书实测。

## 用户/产品视角的验收步骤

1. 保持飞书机器人在线，并确保本地 `nextclaw` 服务处于运行状态。
2. 在飞书里给机器人发送一条普通文本消息。
3. 预期结果：消息发出后，机器人会立即给这条消息加上一个可见 reaction（当前为 `THUMBSUP`）。
4. 随后机器人再输出正常回复；即使回复很快，这个 reaction 也不会被自动撤回。
5. 连续发送两三条消息时，每条消息都应各自收到即时 reaction，不需要等待大模型开始输出。
