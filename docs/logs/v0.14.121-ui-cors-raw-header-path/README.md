# v0.14.121-ui-cors-raw-header-path

## 迭代完成说明

- 在 `packages/nextclaw-server/src/ui/server.ts` 中继续收敛 UI API 的 CORS 热路径：
  - 保留前一版显式 `/api/*` CORS 逻辑，不再依赖 `hono/cors`
  - 进一步移除 `HonoRequest.header()` 调用，改为直接读取原生 `Request.headers`
- 本次修复目标不是依赖服务器加 swap 等环境兜底，而是把 NextClaw 自身在 Node 长运行场景中的高风险请求头读取路径从主链路上移开。
- 保持现有 CORS 行为不变：
  - 支持显式 `corsOrigins`
  - 默认仅放行 `http://localhost:*` 与 `http://127.0.0.1:*`
  - 支持带凭证请求与 `OPTIONS` 预检

## 测试/验证/验收方式

- 受影响包验证：
  - `pnpm -C packages/nextclaw-server test -- --run src/ui/server.cors.test.ts`
  - `pnpm -C packages/nextclaw-server lint`
  - `pnpm -C packages/nextclaw-server tsc`
  - `pnpm -C packages/nextclaw-server build`
- 冒烟/压力验证：
  - 启动本地 UI server
  - 对 `/api/health` 连续发送带 `Origin` 头的请求
  - 观察服务保持可用，且没有出现快速异常膨胀或空响应

## 发布/部署方式

- 随 `@nextclaw/server` / `nextclaw` 下一次 patch 版本一并发布
- 服务器升级到包含本次修复的版本后，重启 NextClaw 托管服务
- 线上验收以 `/api/health`、主页访问、`nextclaw status --json`、`nextclaw remote doctor --json` 为准

## 用户/产品视角的验收步骤

1. 在一台低内存 Linux 机器上安装包含本次修复的版本并启动 NextClaw。
2. 打开 Web UI 并持续刷新或执行远程访问相关操作，确认页面不再出现 `ERR_EMPTY_RESPONSE`。
3. 访问 `/api/health`，确认持续返回 `200`。
4. 执行 `nextclaw status --json`，确认服务健康；若进程退出，状态应降级为真实的 `disconnected`/不健康，而不是误报已连接。
