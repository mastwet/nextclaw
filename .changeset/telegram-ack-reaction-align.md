---
"@nextclaw/core": patch
"@nextclaw/channel-runtime": patch
"nextclaw": patch
---

Align Telegram ack reaction behavior with OpenClaw by adding `channels.telegram.ackReactionScope` and `channels.telegram.ackReaction`, defaulting to `all` and `👀`. Telegram inbound processing now sends an acknowledgment reaction before dispatch when scope rules match.
