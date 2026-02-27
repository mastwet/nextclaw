# v0.8.32-agent-chat-ui

## 迭代完成说明（改了什么）

- 新增 UI 一等入口 `Chat`（`/chat`）：
  - 会话列表（搜索、选择、新建、删除）
  - 消息线程展示（用户/助手气泡、时间戳）
  - 输入区（`Enter` 发送，`Shift+Enter` 换行）
  - 发送中状态反馈与会话自动刷新
  - Agent 选择器（多 Agent 场景）
- 新增 UI API：`POST /api/chat/turn`
  - 路由：`packages/nextclaw-server/src/ui/router.ts`
  - 类型：`ChatTurnRequest` / `ChatTurnView`
  - 能力：把 UI 请求转发到 runtime pool 执行一次对话回合
- 在 CLI 服务层注入 `chatRuntime`，把 UI API 直接连接到 `GatewayAgentRuntimePool.processDirect`。
- 路由与导航更新：
  - 默认首页改为 `/chat`
  - 侧栏新增 `Chat` 导航项
- 国际化文案补齐（中/英）并新增聊天相关文案。
- 为新 API 增加测试：`packages/nextclaw-server/src/ui/router.chat.test.ts`。
- 同步更新发布产物（`packages/nextclaw/ui-dist`）与版本号（`nextclaw@0.8.32`、`@nextclaw/server@0.5.16`、`@nextclaw/ui@0.5.20`）。

## 测试 / 验证 / 验收方式

已执行：

- 单测：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test -- --run src/ui/router.chat.test.ts`
- 类型与静态检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- 全量验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm tsc`

验证结果：

- 构建、lint、tsc 全部通过（存在历史 max-lines warning，无 error）。
- 聊天 API 路由单测通过（3/3）。

冒烟（隔离目录，避免写入仓库）：

- 环境：`NEXTCLAW_HOME=/tmp/nextclaw-chat-smoke.*`
- 命令：
  - 启动：`node packages/nextclaw/dist/cli/index.js ui --port 19097 --no-open`
  - 健康检查：`GET /api/health` 返回 `ok=true`
  - 聊天回合：`POST /api/chat/turn`
- 观察点：
  - 新接口可访问并返回结构化错误（未配置 API Key 时返回 `CHAT_TURN_FAILED`，提示先配置 provider）。

## 发布 / 部署方式

按项目发布流程执行：

1. `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
2. `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`

发布结果：

- 成功发布：
  - `nextclaw@0.8.32`
  - `@nextclaw/server@0.5.16`
  - `@nextclaw/ui@0.5.20`
- 自动创建 tag：
  - `nextclaw@0.8.32`
  - `@nextclaw/server@0.5.16`
  - `@nextclaw/ui@0.5.20`

## 用户 / 产品视角验收步骤

1. 安装或升级到最新版本：`npm i -g nextclaw@0.8.32`
2. 启动服务：`nextclaw start`
3. 浏览器打开 `http://127.0.0.1:18791`，进入左侧 `Chat`
4. 点击“新会话”，输入消息并发送
5. 观察：
   - 消息出现在线程中
   - 会话列表 messageCount / 更新时间变化
   - 切换会话后历史可回看
6. 切换 Agent（若配置了多 Agent），再次发送消息，确认会话可继续多轮。
