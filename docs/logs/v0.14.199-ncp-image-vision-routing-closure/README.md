# v0.14.199-ncp-image-vision-routing-closure

## 迭代完成说明

- 修复 `ncp` 链路里当前用户消息的图片 part 在上下文构建时丢失的问题，确保用户消息会保留原始 `ncp_parts`，并在送模时转换成可识别的图片输入。
- 修复 `NextclawAgentSessionStore` 在 save/load 后丢失用户图片 part 的问题，避免图片消息经过会话持久化后退化成纯文本或路径。
- 为 provider 元数据补充 `visionModels`，并让 `ncp` 图片 turn 在默认模型不具备视觉能力时，显式切换到已配置且可用的视觉模型。
- 去除图片视觉路由对隐式全局 provider registry 安装顺序的依赖；若 registry 尚未安装，显式读取 runtime 内置 provider catalog，保证 `ncp` 主链路行为可预测。
- 为 `nextclaw-ncp-context-builder` 与 `nextclaw-agent-session-store` 补齐图片相关测试，并把测试运行环境隔离到独立 `NEXTCLAW_HOME`，避免全局 session 污染断言结果。

## 测试/验证/验收方式

- 单测：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm --filter nextclaw test -- --run src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts src/cli/commands/ncp/nextclaw-agent-session-store.test.ts`
- 类型检查：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm --filter nextclaw tsc --noEmit`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/runtime tsc --noEmit`
- 可维护性检查：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-current-turn.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-message-bridge.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-agent-session-store.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-agent-session-store.test.ts packages/nextclaw-core/src/providers/types.ts packages/nextclaw-runtime/src/providers/plugins/builtin.ts`
  - 结果：`Errors: 0`，仅剩近预算告警，无阻塞项。
- 本地真实 `ncp` 冒烟：
  - 文本：`PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:/opt/homebrew/bin:$PATH pnpm smoke:ncp-chat -- --session-type native --port 18792 --prompt "Reply exactly OK" --json`
  - 结果：`ok: true`，`assistantText: "OK"`。
  - 带图默认模型：向 `http://127.0.0.1:18792/api/ncp/agent/send` 发送 `metadata.model=preferred_model=dashscope/qwen3.5-plus` 且含 `file(image/png)` part 的真实请求。
  - 结果：返回流式文本 `IMAGE_VISIBLE`，证明默认 `dashscope/qwen3.5-plus` 场景已自动切到可看图模型，而不是只看到文件路径。

## 发布/部署方式

- 本次未执行线上 deploy、npm publish 或桌面包发布。
- 不适用原因：本次问题定位、修复与验收均基于本地 `pnpm dev start` 的 `ncp` 实例闭环验证；对外发布目标、范围和节奏未在本次任务里新增确认。
- 如需继续对外发布，应在此修复基础上执行对应组件的正式发布流程，并复用本 README 的单测、类型检查和本地带图 `ncp` 冒烟作为发布前门禁。

## 用户/产品视角的验收步骤

1. 保持本地 `pnpm dev start` 实例运行，并确认 UI/飞书消息最终走的是 `ncp` 链路。
2. 在飞书里给当前机器人发送一张图片，并附一句简单指令，例如“请描述这张图里是什么”。
3. 观察 AI 回复，不应再出现“我只能看到图片路径 / 无法访问本地文件 / 请重新上传到支持渠道附件”这类文案。
4. 验证 AI 的回复内容应体现对图片本身的识别结果，而不是复述 `img_v3_*`、文件名或占位路径。
5. 若需要进一步回归，可重复测试纯文本消息，确认普通 `ncp` 会话仍能正常返回文本结果。
