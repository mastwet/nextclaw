# 2026-03-01 Provider Test Max Tokens

## 背景 / 问题

- 用户反馈自定义 provider 连接测试报错：
  - `400 Invalid 'max_output_tokens': integer below minimum value. Expected a value >= 16, but got 8 instead.`
- 该问题出现在 UI 的“连接测试”探测请求阶段。

## 决策

- 将 provider 连接测试探测请求的 `maxTokens` 从 `8` 提升到 `16`（符合该类 OpenAI 兼容网关的最小要求）。
- 将该值提取为常量，避免后续回归。
- 增加自动化测试，确保探测请求的 `maxTokens >= 16`。

## 变更内容（迭代完成说明）

- 用户可见变化：
  - 在支持/要求最小 `max_output_tokens=16` 的中转站中，连接测试不再因默认 `8` 报 400。
- 关键实现点：
  - `packages/nextclaw-server/src/ui/config.ts`
    - 新增 `PROVIDER_TEST_MAX_TOKENS = 16`
    - 连接测试探测请求使用该常量。
  - `packages/nextclaw-server/src/ui/router.provider-test.test.ts`
    - 新增回归测试：断言探测请求 `maxTokens >= 16`。

## 测试 / 验证 / 验收方式

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test -- run src/ui/router.provider-test.test.ts
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server build
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server lint
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server tsc
```

验收点：

- provider connection test 路由测试通过。
- `build/lint/tsc` 通过（lint 仅既有 warning，无 error）。

## 用户 / 产品视角验收步骤

1. 新增/编辑一个自定义 provider（OpenAI 兼容中转）。
2. 选择模型后点击“测试连接”。
3. 若该中转要求 `max_output_tokens >= 16`，应不再出现“got 8”报错。

## 发布 / 部署方式

- 本次变更影响 `@nextclaw/server`（及联动发布 `nextclaw`）。
- 按发布流程执行：`docs/workflows/npm-release-process.md`。

## 影响范围 / 风险

- Breaking change：否。
- 风险：低，仅连接测试探测参数的下限调整。
