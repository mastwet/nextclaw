# 渠道

所有消息渠道共享 **allowFrom** 规则：

- **`allowFrom` 为空**（`[]`）：允许所有发送者。
- **`allowFrom` 非空**：仅允许白名单中的用户 ID。

你可以在 UI 中配置渠道，也可以在 `~/.nextclaw/config.json` 的 `channels` 下配置。

## Discord

1. 在 [Discord Developer Portal](https://discord.com/developers/applications) 创建 Bot 并获取 Token。
2. 打开 Bot 的 **MESSAGE CONTENT INTENT**。
3. 邀请 Bot 进服务器并授予读写消息权限。

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowBots": false,
      "allowFrom": [],
      "accountId": "default",
      "dmPolicy": "open",
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["dev-room"],
      "requireMention": true,
      "mentionPatterns": ["@engineer"]
    }
  }
}
```

## Telegram

1. 使用 [@BotFather](https://t.me/BotFather) 创建 Bot 并获取 Token。
2. 使用 [@userinfobot](https://t.me/userinfobot) 获取你的用户 ID。

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["YOUR_USER_ID"],
      "ackReaction": "👀",
      "ackReactionScope": "all"
    }
  }
}
```

可选：设置 `"proxy": "http://localhost:7890"` 以支持代理网络。

- `ackReaction` 默认 `"👀"`（设为空字符串可关闭表情确认）。
- `ackReactionScope` 默认 `"all"`（`off` | `group-mentions` | `group-all` | `direct` | `all`）。

## Slack

使用 Socket mode。需要 **Bot Token** 与 **App-Level Token**（含 `connections:write` 权限）。

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "mode": "socket",
      "botToken": "xoxb-...",
      "appToken": "xapp-...",
      "allowBots": false,
      "dm": { "enabled": true, "allowFrom": [] }
    }
  }
}
```

## 飞书（Lark）

在 [飞书开放平台](https://open.feishu.com/) 创建应用后配置 `appId` 与 `appSecret`。

## WhatsApp（whatsapp-web.js）

首次登录需要扫码。配置示例：

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "allowFrom": []
    }
  }
}
```
