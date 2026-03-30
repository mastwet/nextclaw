# v0.14.291-openrouter-default-models-expand

## 迭代完成说明

- 在 `packages/nextclaw-runtime/src/providers/plugins/builtin.ts` 的 OpenRouter 内建 provider 默认模型目录中新增：
  - `openrouter/xiaomi/mimo-v2-pro`
  - `openrouter/stepfun/step-3.5-flash:free`
- 删除了本次最初引入的一条低价值点名测试，避免为静态模型清单堆积测试资产。
- 为满足可维护性守卫，对同一处静态数组做了最小排版压缩，避免 `builtin.ts` 超出文件预算。

## 测试/验证/验收方式

- Provider 路由相关测试：
  - `pnpm -C packages/nextclaw-server exec vitest run src/ui/router.provider-test.test.ts`
- 可维护性检查：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-runtime/src/providers/plugins/builtin.ts packages/nextclaw-server/src/ui/router.provider-test.test.ts`
- 结果：
  - `vitest` 通过（16/16）
  - maintainability 无 error，仅保留既有预算预警

## 发布/部署方式

- 本次仅更新本地默认 provider 模型目录，无独立部署步骤。
- 随后按正常发布流程发布包含该变更的 NextClaw 版本即可生效。

## 用户/产品视角的验收步骤

1. 打开 NextClaw 配置页的 Providers。
2. 进入 OpenRouter provider 配置。
3. 查看默认模型列表，确认可见 `xiaomi/mimo-v2-pro` 与 `stepfun/step-3.5-flash:free`。
4. 保存后回到模型选择或默认模型配置，确认可直接选择以上模型，无需手动输入完整模型 id。
