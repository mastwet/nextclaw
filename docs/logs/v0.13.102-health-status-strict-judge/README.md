# v0.13.102-health-status-strict-judge

## 迭代完成说明（改了什么）
- 将 UI 初始健康探测从“仅判断 HTTP 是否成功”改为“严格根据健康接口 `status` 字段判断”。
- 新判定条件：仅当 `/api/health` 响应满足 `payload.ok === true && payload.data.status === "ok"` 时，才视为健康并展示连接态。

## 测试/验证/验收方式
- `pnpm -C packages/nextclaw-ui tsc`（通过）
- `pnpm -C packages/nextclaw-ui build`（通过）

## 发布/部署方式
- 发布前执行：`pnpm -C packages/nextclaw-ui tsc && pnpm -C packages/nextclaw-ui build`
- 正式发布按仓库既有 release/changeset 流程。
- 不适用项：远程 migration（未涉及数据库变更）。

## 用户/产品视角的验收步骤
1. 刷新聊天主界面。
2. 当后端 `/api/health` 返回 `status: ok` 时，状态点显示为连接态。
3. 若接口返回非 `ok`（或结构不符合），状态点不应误显示为连接态。
