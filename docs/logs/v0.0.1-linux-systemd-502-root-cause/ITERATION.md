# Iteration v0.0.1-linux-systemd-502-root-cause

## 迭代完成说明
- 明确定位服务器公网 `502 Bad Gateway` 的根因：`nginx` 反向代理固定指向 `127.0.0.1:18791`，但 `nextclaw` 进程未处于受管常驻状态，导致上游端口无人监听时直接返回 `502`。
- 在 `packages/nextclaw` 新增 Linux `systemd` 集成命令：`nextclaw service install-systemd` 与 `nextclaw service uninstall-systemd`，把“手动后台启动”升级为“系统级受管常驻”。
- 更新 `README.md`、`README.zh-CN.md`、`docs/USAGE.md`、`apps/docs/en/guide/commands.md`、`apps/docs/zh/guide/commands.md`，明确 Linux 服务器 + Nginx/Caddy/Traefik 场景必须使用 `systemd` 托管，否则重启/退出后反代会出现 `502`。
- 已在测试服务器 `8.219.57.52` 上安装并启用 `nextclaw.service`，当前通过 `systemd` 托管运行。

## 测试 / 验证 / 验收方式
- 本地工程验证：
  - `pnpm build`
  - `pnpm lint`
  - `pnpm tsc`
- 远程服务器验证：
  - `systemctl is-active nextclaw.service` 返回 `active`
  - `curl http://127.0.0.1:18791/api/health` 返回 `200` 且 body 为 `{"ok":true,"data":{"status":"ok"}}`
  - `curl http://8.219.57.52/api/health` 返回 `200` 且 body 为 `{"ok":true,"data":{"status":"ok"}}`
- 根因验证证据：
  - `nginx error.log` 出现 `connect() failed (111: Connection refused) while connecting to upstream ... 127.0.0.1:18791`
  - `nextclaw status --json` 在故障时显示 `serviceStateExists: false`、`service not running`

## 发布 / 部署方式
- Linux 服务器公开部署推荐流程：
  - 安装/升级 CLI：`npm i -g nextclaw`
  - 安装受管服务：`sudo nextclaw service install-systemd`
  - 查看服务状态：`systemctl status nextclaw`
  - 查看日志：`journalctl -u nextclaw -f`
  - 反向代理将公网入口转发到 `http://127.0.0.1:18791`
- 若需要移除托管服务：
  - `sudo nextclaw service uninstall-systemd`
- 本次测试服务器已执行：
  - 写入 `/etc/systemd/system/nextclaw.service`
  - `systemctl daemon-reload`
  - `systemctl enable --now nextclaw.service`

## 用户 / 产品视角的验收步骤
- 在 Linux 服务器安装 NextClaw 后，执行 `sudo nextclaw service install-systemd`。
- 用 `systemctl status nextclaw` 确认服务为 `active (running)`。
- 浏览器访问公网域名/IP，页面应正常打开，不再出现 `502 Bad Gateway`。
- 访问 `/api/health`，应返回 `{"ok":true,"data":{"status":"ok"}}`。
- 重启服务器后再次访问公网入口，服务应自动恢复，无需手动重新执行 `nextclaw start`。
