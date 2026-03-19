# v0.14.42 MCP Plan Global Server Visibility

## 迭代完成说明

本次迭代对通用 MCP 方案文档做了一轮重要简化，去掉了按 runtime 切分 MCP server 可见性的设计，统一收敛为“平台级全局 server 资产”模型。

本次调整的核心包括：

- 删除 `scope.runtimes` 与相关的 registry 级 runtime 可见性设计。
- 明确 MCP server 默认应作为平台级全局资产存在，而不是在注册层按 runtime 做切分。
- 明确 runtime adapter 只负责“能否消费 / 如何消费”，不负责维护第二套 server 可见性规则。
- 同步清理配置示例、CLI 默认值、`list/doctor` 描述与验收标准中的 runtime scope 假设。
- 将“如果未来需要更细粒度约束，应放在调用策略层而不是 registry 层”写入方案。

相关方案文档：

- [Generic MCP Registry Plan](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-19-generic-mcp-registry-plan.md)

## 测试 / 验证 / 验收方式

本次改动仅补充和修正文档，未触达项目代码路径。

已执行：

- 文档一致性检查：确认配置示例、架构说明、CLI 设计、验收标准已统一移除 `scope.runtimes` 假设。
- 语义检查：确认文档已明确“server 平台级全局资产”和“adapter 不管理可见性”的新原则。
- 版本基线检查：扫描 `docs/logs` 有效目录，确认新增版本从当前最大有效版本 `v0.14.41` 递增到 `v0.14.42`。

不适用：

- `build` 不适用，因为未触达构建链路。
- `lint` 不适用，因为未触达源码或可 lint 文件。
- `tsc` 不适用，因为未触达 TypeScript 代码。
- 冒烟测试不适用，因为本次未引入用户可运行行为改动。

## 发布 / 部署方式

本次迭代仅为方案文档优化，无需发布或部署。

后续进入实现阶段时，应按新的简化模型推进：

1. `mcp.servers.*` 作为平台级全局配置
2. adapter 只负责消费
3. 不设计 runtime 级 server 可见性切分

## 用户 / 产品视角的验收步骤

1. 打开方案文档，确认配置示例中不再出现 `scope.runtimes`。
2. 确认文档中已明确 MCP server 是平台级全局资产。
3. 确认文档中已明确 runtime adapter 只负责消费，不负责 server 可见性管理。
4. 确认 CLI 与验收标准中已同步去除 runtime scope 相关描述。
