# v0.14.152-weixin-host-package-rollout

## 迭代完成说明

- 在独立微信插件 `@nextclaw/channel-plugin-weixin@0.1.5` 已发布的基础上，继续发布宿主链路相关包：
  - `@nextclaw/openclaw-compat`
  - `@nextclaw/server`
  - `@nextclaw/remote`
  - `@nextclaw/mcp`
  - `nextclaw`
- 目的不是重复修微信逻辑，而是让通过宿主包安装的用户也能拿到最新的微信重扫替换连接能力。
- 本次发版只包含与宿主依赖链联动相关的版本号和 changelog 变更，不夹带仓库里其它无关 WIP。

## 测试/验证/验收方式

- 已确认 npm 发布前置版本状态：
  - `@nextclaw/channel-plugin-weixin` 从 `0.1.4` 发布到 `0.1.5`
  - 宿主链路待发布版本在本地已完成升版
- 功能验证沿用上一迭代：
  - 微信插件 `lint` / `tsc` / `build` 通过
  - 微信 UI 相关测试、`tsc`、`build` 通过
  - 真实插件 `auth.start/auth.poll` 替换场景脚本通过
- 本次宿主发版额外验收：
  - 发布后逐个回查 npm registry 版本
  - 使用已发布 `nextclaw` 做最小安装/启动冒烟，确认包可安装且 CLI 可正常启动

## 发布/部署方式

- 先提交本次宿主链路的版本与 changelog 变更。
- 使用干净工作树逐个发布：
  - `@nextclaw/mcp`
  - `@nextclaw/openclaw-compat`
  - `@nextclaw/server`
  - `@nextclaw/remote`
  - `nextclaw`
- 发布后逐个执行 `npm view <pkg> version` 或 `dist-tags` 回查。

## 用户/产品视角的验收步骤

1. 安装或升级到本次发布后的 `nextclaw` 最新版本。
2. 打开配置界面，进入微信渠道。
3. 对同一个微信账号重复扫码登录。
4. 观察结果：
   - 当前连接应被更新
   - 不应持续新增重复 bot
   - 重进页面后连接状态保持一致
5. 发送测试消息，确认最新连接仍可正常收发。
