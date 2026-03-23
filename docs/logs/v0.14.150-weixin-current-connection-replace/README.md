# v0.14.150-weixin-current-connection-replace

## 迭代完成说明

- 修复微信渠道同一微信账号重新扫码时不断新增 bot 的问题。
- 登录确认后会识别“当前连接”对应的旧微信账号，并替换为最新扫码返回的 bot 账号。
- 替换动作覆盖三层数据：
  - 插件配置中的旧账号条目会被移除。
  - 本地保存的旧账号 token 文件会被删除。
  - 本地保存的旧账号 cursor 文件会被删除。
- `defaultAccountId` 会切换为最新扫码成功的 bot 账号，避免界面和运行时继续指向旧连接。

## 测试/验证/验收方式

- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-channel-plugin-weixin tsc`
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-channel-plugin-weixin build`
- Lint 验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-channel-plugin-weixin lint`
- 账号替换冒烟：
  - 使用临时 `NEXTCLAW_HOME` 预写入旧账号与旧 cursor。
  - 通过插件公开 `auth.start/auth.poll` 流程模拟“同一微信重新扫码返回新 bot id”。
  - 验证结果：
    - 返回状态为 `authorized`
    - `defaultAccountId` 更新为新 bot
    - 配置中仅保留新 bot
    - 旧账号文件已删除
    - 旧 cursor 文件已删除
    - 新 token/baseUrl 已落盘

## 发布/部署方式

- 本次仅为本地代码修复与验证，未执行发布。
- 如需后续发布，按项目既有 NPM/应用发布流程执行，并在发布前复跑本迭代记录中的验证命令。

## 用户/产品视角的验收步骤

1. 在设置页进入微信渠道配置。
2. 对已经连接过的同一个微信再次发起扫码连接。
3. 使用同一个微信账号扫码并确认登录。
4. 观察连接结果：
   - 当前连接应直接更新为最新连接
   - 不应新增重复 bot
   - 重新进入页面后，已连接账号应仍保持唯一且为最新连接
5. 发送一条测试消息，确认新连接可正常收发。
