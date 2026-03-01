# v0.0.1-qq-auto-reconnect

## 迭代完成说明（改了什么）

- 目标：修复 QQ 渠道在认证失败后需要手动重启的问题。
- 变更文件：`packages/extensions/nextclaw-channel-runtime/src/channels/qq.ts`
- 核心改动：
  - `start()` 从“单次启动失败即结束”改为“后台连接监督”。
  - 当 QQ 启动失败（如 token 获取失败）时，自动进行指数退避重试（含轻微随机抖动），不再要求人工重启网关。
  - 增加会话死亡（`SessionEvents.DEAD`）后的自动重连。
  - `stop()` 增加重试定时器清理与连接任务收敛，避免残留重连任务。

## 测试 / 验证 / 验收方式

### 1) 静态与构建验证

在 `packages/extensions/nextclaw-channel-runtime` 执行：

- `build`：`pnpm -C packages/extensions/nextclaw-channel-runtime build`
- `lint`：`pnpm -C packages/extensions/nextclaw-channel-runtime lint`
- `tsc`：`pnpm -C packages/extensions/nextclaw-channel-runtime tsc`

结果：均通过（lint 为既有 max-lines warning，无新增 error）。

### 2) 冒烟验证（认证失败自动重试）

- 方式：使用 mock bot 强制 `start()` 抛出认证错误，验证 `QQChannel.start()` 不抛错退出，并自动安排下一次重试。
- 观察点：
  - 输出 `start failed ... retry in ...ms`
  - 输出 `smoke ok: scheduled=true startCount=1`

结果：通过。

## 发布 / 部署方式

- 本次仅代码实现，未执行发布。
- 按项目发布流程执行：
  - 按需走 changeset/version/publish。
  - 发布后在目标环境执行 QQ 渠道在线冒烟（见下节）。

## 用户 / 产品视角验收步骤

1. 启动网关（`nextclaw start`）。
2. 在 UI 配置 QQ `appId/secret` 并保存，保持网关运行。
3. 若 QQ 平台临时返回认证错误（例如 `机器人不存在` 或 token 获取失败），观察日志应出现自动重试，而不是永久静默。
4. 当 QQ 凭证恢复可用后，无需手动重启，日志应出现 `QQ bot connected`。
5. 在 QQ 侧发送消息，机器人应恢复正常回复。
