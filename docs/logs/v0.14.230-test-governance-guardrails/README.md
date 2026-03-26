# v0.14.230-test-governance-guardrails

## 迭代完成说明

- 在 [AGENTS.md](../../../AGENTS.md) 新增 `test-asset-budget-first` 规则，把测试视为有维护成本的资产，明确新增测试必须优先保护外部契约，禁止为低价值实现细节堆积测试。
- 在 [package.json](../../../package.json) 新增两个命令：
  - `pnpm report:test-governance`
  - `pnpm check:test-governance`
- 新增 [scripts/test-governance-report.mjs](../../../scripts/test-governance-report.mjs)，自动扫描仓库测试分布，输出包级测试/源码比、超大测试文件、case 密度和 mock 密度热点。
- 本次刻意没有新增 PR 模板，避免在当前流程上额外叠一层表单；先优先落地规则和自动化报表。

## 测试/验证/验收方式

- 运行 `node scripts/test-governance-report.mjs`
  - 结果：命令可正常输出当前仓库测试热点。
  - 关键观察点：
    - 包级热点命中 `packages/nextclaw-server`
    - 文件级热点命中 `packages/extensions/nextclaw-channel-plugin-feishu/src/bot.test.ts`
    - 输出包含预警/阻塞阈值说明
- 运行 `node -e 'const pkg=require("./package.json"); console.log(pkg.scripts["report:test-governance"]); console.log(pkg.scripts["check:test-governance"]);'`
  - 结果：确认两个命令已接入根脚本。
- `build/lint/tsc`：本次未触达运行时代码路径，非必须；按最小充分验证原则不执行。
- 冒烟测试：不适用。本次为仓库治理规则与分析脚本落地，不涉及用户可运行功能变更。

## 发布/部署方式

- 无需单独部署。
- 合并后团队可直接在仓库根目录执行：
  - `pnpm report:test-governance` 用于巡检
  - `pnpm check:test-governance` 用于阻塞模式或后续接入 CI

## 用户/产品视角的验收步骤

1. 在仓库根目录运行 `pnpm report:test-governance`。
2. 确认命令会列出当前测试热点包和热点测试文件，而不是只给总数。
3. 打开 [AGENTS.md](../../../AGENTS.md)，确认存在 `test-asset-budget-first` 规则，并且规则里写清楚新增测试的边界、阈值和治理动作。
4. 运行 `pnpm check:test-governance`，确认当仓库存在阻塞级热点时命令会以非零状态退出，可用于后续接入 CI。
