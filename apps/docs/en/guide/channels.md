# Channels

All message channels use a common **allowFrom** rule:

- **Empty `allowFrom`** (`[]`): allow all senders.
- **Non-empty `allowFrom`**: only messages from the listed user IDs are accepted.

Configure channels in the UI or in `~/.nextclaw/config.json` under `channels`.

## Discord

1. Create a bot in the [Discord Developer Portal](https://discord.com/developers/applications) and get the bot token.
2. Enable **MESSAGE CONTENT INTENT** for the bot.
3. Invite the bot to your server with permissions to read and send messages.

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

1. Create a bot via [@BotFather](https://t.me/BotFather) and get the token.
2. Get your user ID from [@userinfobot](https://t.me/userinfobot).

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

Optional: set `"proxy": "http://localhost:7890"` for network access.

- `ackReaction` default is `"👀"` (set empty string to disable).
- `ackReactionScope` default is `"all"` (`off` | `group-mentions` | `group-all` | `direct` | `all`).

## Slack

Socket mode setup. You need a **Bot Token** and an **App-Level Token** (with `connections:write`).

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

## Feishu (Lark)

Create an app in the [Feishu open platform](https://open.feishu.com/).

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "YOUR_APP_ID",
      "appSecret": "YOUR_APP_SECRET",
      "encryptKey": "",
      "verificationToken": "",
      "allowFrom": []
    }
  }
}
```

## DingTalk

```json
{
  "channels": {
    "dingtalk": {
      "enabled": true,
      "clientId": "YOUR_CLIENT_ID",
      "clientSecret": "YOUR_CLIENT_SECRET",
      "allowFrom": []
    }
  }
}
```

## WeCom (Enterprise WeChat)

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "corpId": "YOUR_CORP_ID",
      "agentId": "1000002",
      "secret": "YOUR_APP_SECRET",
      "token": "YOUR_CALLBACK_TOKEN",
      "callbackPort": 18890,
      "callbackPath": "/wecom/callback",
      "allowFrom": []
    }
  }
}
```

## WhatsApp

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "bridgeUrl": "ws://localhost:3001",
      "allowFrom": []
    }
  }
}
```

## Email

```json
{
  "channels": {
    "email": {
      "enabled": true,
      "consentGranted": true,
      "imapHost": "imap.example.com",
      "imapPort": 993,
      "imapUsername": "you@example.com",
      "imapPassword": "YOUR_PASSWORD",
      "smtpHost": "smtp.example.com",
      "smtpPort": 587,
      "smtpUsername": "you@example.com",
      "smtpPassword": "YOUR_PASSWORD",
      "smtpUseTls": true,
      "fromAddress": "you@example.com",
      "autoReplyEnabled": true,
      "pollIntervalSeconds": 30,
      "allowFrom": []
    }
  }
}
```

## QQ

```json
{
  "channels": {
    "qq": {
      "enabled": true,
      "appId": "YOUR_APP_ID",
      "secret": "YOUR_SECRET",
      "allowFrom": []
    }
  }
}
```

After changing channel config, NextClaw hot-reloads channel runtime automatically when the gateway is running.
