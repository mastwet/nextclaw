# v0.0.1-start-message-clarity

## 迭代完成说明

- 优化 `nextclaw start` 成功后的服务管理提示，避免用户把提示文案误解为“服务已停止”。
- 将原有 `Stop: nextclaw stop` 替换为更明确的管理区块：
  - `Service controls:`
  - `Check status: nextclaw status`
  - `Stop later (this command is only a hint): nextclaw stop`
- 抽取统一方法 `printServiceControlHints()`，覆盖“已在运行”与“新启动成功”两条路径，避免重复文案漂移。

## 验证与验收

- 验证命令与结果见 [VALIDATION.md](./VALIDATION.md)。
- 用户侧验收步骤见 [ACCEPTANCE.md](./ACCEPTANCE.md)。

## 发布与部署

- 发布/部署方式见 [RELEASE.md](./RELEASE.md)。
