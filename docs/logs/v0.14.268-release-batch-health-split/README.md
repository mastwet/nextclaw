# v0.14.268-release-batch-health-split

## 迭代完成说明

- 将原来的仓库级 release 守卫拆成了两条明确职责的链路。
- `scripts/check-release-groups.mjs` 现在只检查“本次明确要发的包”，范围由 pending changeset 和当前已版本化但尚未打 tag 的包共同决定，不再把仓库里所有历史漂移一起算进发布阻塞项。
- 新增 `scripts/report-release-health.mjs`，专门输出仓库里仍然存在的未发布漂移，但它是报告型检查，不阻塞当前单包或当前批次发布。
- 抽出共享的 [`scripts/release-scope.mjs`](../../../../scripts/release-scope.mjs)，把 workspace 扫描、changeset 解析、tag 判定和漂移读取统一到一处，避免两个入口重复维护同一套规则。
- 更新 [`docs/workflows/npm-release-process.md`](../../../../docs/workflows/npm-release-process.md)，明确说明 batch guard 和 health report 的职责边界。

## 测试/验证/验收方式

- 语法检查：
  - `node --check scripts/release-scope.mjs`
  - `node --check scripts/check-release-groups.mjs`
  - `node --check scripts/report-release-health.mjs`
- 真实运行：
  - `node scripts/check-release-groups.mjs`
  - `node scripts/report-release-health.mjs`
- 隔离仓库冒烟：
  - 在临时 git 仓库里构造两个 public package、一个 pending changeset 和一个无关漂移包，确认 batch guard 放行、health report 只提示无关漂移。
- 可维护性闸门：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths scripts/release-scope.mjs scripts/check-release-groups.mjs scripts/report-release-health.mjs package.json docs/workflows/npm-release-process.md`

## 发布/部署方式

- 本次未执行新的正式发布或部署。
- 这次改动只调整 release 流程本身，后续若要发布仍按仓库标准流程执行：
  - `pnpm release:version`
  - `pnpm release:publish`

## 用户/产品视角的验收步骤

1. 在存在历史未发布漂移的工作区里执行 `pnpm release:check:groups`，确认它只关注当前明确要发的包，不再被无关历史漂移阻塞。
2. 执行 `pnpm release:report:health`，确认它会列出那些仍然没发干净的包，但不会阻断当前批次发布。
3. 再走一次标准发布流程，确认 `release:version` / `release:publish` 的行为不再因为仓库里历史遗留包而被强行扩大到整仓。

## 红区触达与减债记录

### scripts/

- 本次是否减债：否
- 说明：新增了 `release-scope` 共享 helper 和两个 release 入口脚本，职责更清晰，但 `scripts/` 目录整体仍处于高密度自动化入口区，文件数继续增长。
- 下一步拆分缝：把 release 相关脚本进一步收敛到更明确的子目录或统一入口层，保留 `package.json` 的对外命令，只减少根目录直出文件的继续膨胀。
