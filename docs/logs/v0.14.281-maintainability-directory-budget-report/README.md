# v0.14.281-maintainability-directory-budget-report

## 迭代完成说明

- 将目录文件数预算抽到仓库级共享脚本 `scripts/maintainability-directory-budget.mjs`，统一承载目录预算阈值、豁免解析、diff-only 判断与仓库级热点扫描逻辑。
- 将 `.agents/skills/post-edit-maintainability-guard/scripts/maintainability-guard-directory-budget.mjs` 改为复用共享脚本，避免 guard 与 report 各维护一套目录预算规则。
- 为 `scripts/eslint-maintainability-report.mjs` 增加 `directoryBudget` section，在统一 maintainability report 中输出目录热点、预算级别、豁免状态与豁免原因。
- 目录预算扫描新增生成物忽略规则，明确排除 `ui-dist`、`release`、`tmp`、`out` 等目录，避免构建产物污染治理报告。
- 新增共享模块测试 `scripts/maintainability-directory-budget.test.mjs`，覆盖目录预算豁免解析、阈值判断与仓库级热点扫描。

## 测试/验证/验收方式

- 运行单元测试：
  - `node --test scripts/maintainability-directory-budget.test.mjs .agents/skills/post-edit-maintainability-guard/scripts/maintainability-guard-directory-budget.test.mjs`
- 运行统一可维护性报告：
  - `node scripts/eslint-maintainability-report.mjs --fail-on-coverage-gaps`
- 运行 diff-only maintainability guard：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --no-fail`
- 验证点：
  - 统一报告输出中出现 `Directory budget hotspots` section。
  - `packages/demo/ui-dist/assets` 这类生成目录不会进入共享模块测试的热点结果。
  - guard 输出仍能正确识别 `scripts` 目录预算告警，并读取 `scripts/README.md` 中的目录预算豁免说明。

## 发布/部署方式

- 本次变更为仓库治理脚本与文档更新，无独立线上部署动作。
- 若后续需要随版本发布，只需按常规仓库发布流程带上本次改动即可；本次不涉及数据库 migration、服务部署或前端静态资源发布。

## 用户/产品视角的验收步骤

- 在仓库根目录运行 `node scripts/eslint-maintainability-report.mjs --fail-on-coverage-gaps`。
- 确认输出除了 ESLint 维护性违规外，还会额外展示 `Directory budget hotspots` 分段。
- 检查热点列表中能看到真实目录热点，例如 `packages/extensions/nextclaw-channel-plugin-feishu/src`、`packages/nextclaw-openclaw-compat/src/plugins`、`packages/nextclaw-core/src/agent`。
- 检查热点列表中不会出现 `ui-dist`、`release` 等生成目录。
- 在日常改动后运行 `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --no-fail`，确认 diff-only guard 与统一报告使用同一套目录预算语义。
