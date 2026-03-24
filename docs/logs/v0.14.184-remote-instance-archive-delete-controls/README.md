# v0.14.184-remote-instance-archive-delete-controls

## 迭代完成说明

- 为 platform remote instance 增加显式归档与删除能力：
  - backend 新增 `archive` / `unarchive` / `delete` 接口
  - D1 `remote_devices` 新增 `archived_at`
  - 实例主列表默认只返回未归档实例，`includeArchived=true` 可查看全量
- 调整实例注册语义：同一个 `device_install_id` 重新注册时会自动清空 `archived_at`，避免真实实例恢复在线后仍被隐藏。
- platform console 新增归档区：
  - 主列表支持 `Archive`
  - 归档列表支持 `Restore` / `Delete`
  - 删除前要求实例已经归档且当前离线，避免误删活跃实例
- 更新平台 worker README 的 Remote Access 接口索引，并扩展 platform console smoke 覆盖归档/恢复/删除交互。

## 测试 / 验证 / 验收方式

- 构建与静态检查
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api build`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api tsc`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C apps/platform-console build`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C apps/platform-console lint`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C apps/platform-console tsc`
- 前端冒烟
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C apps/platform-console preview --host 127.0.0.1 --port 4173`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node scripts/platform-console-smoke.mjs`
  - 结果：通过，覆盖 dashboard 首屏、语言切换、实例归档、恢复、删除交互
- backend 真链路冒烟
  - 本地临时 D1 + `wrangler dev --local` 启动 worker，真实执行登录、注册实例、归档、默认列表隐藏、`includeArchived=true` 显示、恢复、再次归档、删除整链路
  - 结果：通过，输出 `[remote-instance-api-smoke] passed`
- 线上冒烟
  - `https://ai-gateway-api.nextclaw.io/health` 返回 `200`
  - 未登录访问 `GET /platform/remote/instances` 返回 `401`
  - 未登录访问 `POST /platform/remote/instances/demo/archive` 返回 `401`
  - 新 console 部署地址 `https://59476916.nextclaw-platform-console.pages.dev` 返回 `200`

## 发布 / 部署方式

- 远程 migration
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm platform:db:migrate:remote`
  - 说明：首次并发手动执行时命中过一次 `duplicate column name: archived_at`，随后由正式 `deploy:platform:backend` 流程中的 migration 成功落地；最终远端迁移状态为 `0011_remote_instance_archive_controls.sql ✅`
- 平台 backend
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm deploy:platform:backend`
  - 结果：成功，Worker version `c8cce155-7592-49fc-9a2c-d1736c52c41a`
- 平台 console
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm deploy:platform:console`
  - 结果：成功，Pages 部署地址 `https://59476916.nextclaw-platform-console.pages.dev`
- 不适用项
  - `deploy:platform:admin`：本次未触达 admin 站
  - NPM package release：本次未触达需要发包的 public workspace package

## 用户 / 产品视角的验收步骤

1. 登录 `platform.nextclaw.io`，进入 `My Instances / 我的实例`。
2. 对一个旧的离线实例点击 `Archive / 归档`，确认它从主列表消失并进入 `Archived instances / 已归档实例`。
3. 在归档区点击 `Restore / 恢复`，确认它重新回到主列表。
4. 再次归档同一个离线实例，点击 `Delete / 删除`，确认它从归档区彻底消失。
5. 回到桌面端重新让同一个真实 NextClaw 实例上线，确认它会重新出现在主列表，而不是永久隐藏。
