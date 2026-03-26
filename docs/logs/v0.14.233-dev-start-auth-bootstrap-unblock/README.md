# v0.14.233-dev-start-auth-bootstrap-unblock

## 迭代完成说明

- 诊断了 `pnpm dev start` 冷启动链路，确认问题分成两层：
  - `tsx watch + CLI` 冷启动到 backend 真正进入 `index.ts` 约需 `2.6s~3.0s`
  - frontend 首屏 `auth/status` 是 hard gate，而插件启动会在 UI shell 起好后立刻进入重同步阶段，导致基座可服务窗口被吞掉
- 调整了前端 auth bootstrap 策略：
  - `useAuthStatus` 首次引导改为短超时、快速重试
  - 首次成功后恢复常规 `5s` 请求超时
- 调整了后端 dev 启动节奏：
  - `UI shell` 启动后，显式保留一个可服务 grace window，再进入插件重启动作
  - 目标是让 `/api/health` 和 `/api/auth/status` 先返回，插件随后继续启动
- 新增 `service-ui-shell-grace.ts`，避免继续膨胀 `service.ts`

## 测试/验证/验收方式

- 类型检查：
  - `pnpm -C packages/nextclaw-openclaw-compat tsc -p tsconfig.json`
  - `pnpm -C packages/nextclaw tsc -p tsconfig.json`
  - `pnpm -C packages/nextclaw-ui tsc -p tsconfig.json`
- 定向测试：
  - `pnpm -C packages/nextclaw-ui exec vitest run src/hooks/use-auth.test.ts src/api/client.test.ts`
- 冷启动定点测量：
  - 使用真实 `NEXTCLAW_HOME=/Users/peiwang/.nextclaw`
  - 同时测 `127.0.0.1:18896/api/auth/status` 与 `127.0.0.1:5278/api/auth/status`
- 关键结果：
  - 修复前：`direct_auth_ready_ms ~= 16645`，`proxy_auth_ready_ms` 同量级
  - 修复后：`direct_auth_ready_ms ~= 2665`，`proxy_auth_ready_ms ~= 2669`
  - `frontend_http_ready_ms ~= 910`
  - `first_backend_trace_ms ~= 2640`
  - `ui_shell_ready_ms ~= 2649`

## 发布/部署方式

- 本次为本地 dev 启动链路修复，无需单独部署步骤
- 若后续要发布，按常规 NPM / 应用发布闭环执行，并额外复测：
  - `pnpm dev start`
  - 打开本地 UI
  - 确认首屏不再长时间停留在“正在等待本地 UI 服务启动”

## 用户/产品视角的验收步骤

1. 在仓库根目录执行 `pnpm dev start`
2. 观察终端打印的 `[dev] Frontend` 地址并立即打开
3. 预期在约 `3s` 量级内越过 auth bootstrap，不再出现十几秒级的首屏等待
4. 进入聊天首页后，侧边栏与主内容应可见
5. 即使渠道和插件仍在后台继续启动，首屏基座也应先可用
