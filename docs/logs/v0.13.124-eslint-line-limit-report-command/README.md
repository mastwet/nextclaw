# v0.13.124-eslint-line-limit-report-command

## 迭代完成说明

- 在根 [package.json](/Users/tongwenwen/Projects/Peiiii/nextclaw/package.json) 新增命令 `pnpm lint:line-limits`。
- 新增脚本 [scripts/eslint-line-limit-report.mjs](/Users/tongwenwen/Projects/Peiiii/nextclaw/scripts/eslint-line-limit-report.mjs)，统一扫描所有带 ESLint `lint` 脚本的 workspace。
- 报表仅聚焦 `max-lines` 与 `max-lines-per-function`，按 workspace、文件、规则输出汇总，避免从常规 `lint` 输出里人工翻找。
- 处理了嵌套 workspace 去重，避免 `apps/ncp-demo` 及其子包被重复统计。
- 支持 `--json` 结构化输出，便于后续接自动治理脚本；支持 `--fail-on-violations` 以非零退出码用于 CI 或阶段门禁。

## 测试/验证/验收方式

- `pnpm lint:line-limits`
  - 结果：命令执行成功，输出当前仓库共 `27` 条 line-limit 违规、涉及 `21` 个文件。
- `pnpm lint:line-limits -- --fail-on-violations`
  - 结果：按预期返回退出码 `1`，可用于治理门禁。
- `node scripts/eslint-line-limit-report.mjs --json`
  - 结果：可被 JSON 解析；当前 `violationsByRule` 为 `max-lines,max-lines-per-function`。
- `build/lint/tsc`
  - 不适用：本次新增的是治理脚本与根命令入口，未修改业务运行链路、构建产物或 TypeScript 编译目标；已通过真实命令冒烟覆盖本次用户可见行为。

## 发布/部署方式

- 不适用：本次仅新增本地治理命令，无需单独部署。
- 如需随版本发布，按仓库既有发布流程正常合入后进入下一次常规发布即可。

## 用户/产品视角的验收步骤

1. 在仓库根目录执行 `pnpm lint:line-limits`。
2. 确认终端先输出总数摘要，再按 workspace 和文件列出 `max-lines` / `max-lines-per-function` 违规。
3. 如需给脚本或仪表盘消费，执行 `pnpm lint:line-limits -- --json`，确认输出为标准 JSON。
4. 如需在治理阶段阻断超限，执行 `pnpm lint:line-limits -- --fail-on-violations`，确认当前仓库因存在违规而返回非零退出码。
