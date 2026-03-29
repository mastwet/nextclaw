# v0.14.285-incremental-maintainability-paydown-governance

## 迭代完成说明

- 新增工作流文档 [`docs/workflows/incremental-maintainability-paydown.md`](../../workflows/incremental-maintainability-paydown.md)，把“每次代码任务顺手减一点债”的默认机制写成正式文件。
- 文档明确了这套机制的目标、适用范围、默认动作池、可跳过场景、执行顺序与输出要求，避免后续 AI 只把“减债”理解成一次性大型治理。
- 在 [`AGENTS.md`](../../../AGENTS.md) 的 Project Rulebook 中新增 `incremental-maintainability-paydown-on-touch` 规则，让后续 AI 在完成主任务后默认评估并执行一个低风险、同链路的 micro-paydown；若不执行，必须说明原因与下一步拆分缝。

## 测试/验证/验收方式

- 本次改动未触达项目代码、脚本运行逻辑或构建链路，`build` / `lint` / `tsc` 不适用。
- 执行文本与引用校验：
  - `rg -n "incremental-maintainability-paydown-on-touch|Incremental Maintainability Paydown" AGENTS.md docs/workflows/incremental-maintainability-paydown.md`
- 验证点：
  - `AGENTS.md` 中存在新增规则 `incremental-maintainability-paydown-on-touch`
  - 工作流文档存在并可通过相对链接从 `AGENTS.md` 跳转
  - 文档中明确包含“主任务优先、每次只减一点、不能无限扩 scope、不做时必须说明原因”四个关键约束

## 发布/部署方式

- 本次为仓库治理文档与规则更新，无独立发布或部署动作。
- 后续随仓库正常迭代生效，无需额外 migration、服务部署或前端发布。

## 用户/产品视角的验收步骤

- 打开 [`docs/workflows/incremental-maintainability-paydown.md`](../../workflows/incremental-maintainability-paydown.md)，确认它已经把“以后 AI 每次顺手减一点债”的机制讲清楚。
- 打开 [`AGENTS.md`](../../../AGENTS.md)，确认 Project Rulebook 中新增了 `incremental-maintainability-paydown-on-touch`。
- 之后让 AI 执行任意代码任务时，观察最终说明里是否会额外说明：
  - 本次是否顺手减债
  - 若没有减债，原因是什么
  - 下一步拆分缝是什么
