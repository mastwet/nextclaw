---
name: cron
description: Schedule reminders and recurring tasks.
---

# Cron

Use the `cron` tool to schedule reminders or recurring tasks.

Before creating a job, decide whether the user wants a one-time action or a recurring action:

- Use `at` for one-time tasks such as "in 5 minutes", "at 6pm today", "tomorrow morning", or "only once".
- Use `every` only for true intervals that should repeat forever.
- Use `cron` only for repeating calendar schedules such as "every weekday at 9am".

When filling `message`, write the runtime instruction for the agent, not just the final outbound text fragment.

- Good: `At the scheduled time, send a WeChat message to the current chat saying: "会议还有 5 分钟开始。"`
- Bad: `会议还有 5 分钟开始。`

If the user wants an exact message sent through WeChat or another channel, the instruction should explicitly say to send that exact text.

## Actions

- `add`: create a scheduled job
- `list`: list all existing jobs, including disabled ones
- `enable`: enable an existing job
- `disable`: disable an existing job without deleting it
- `remove`: delete an existing job

## Examples

Fixed reminder:
```
cron(action="add", name="break-reminder", message="Time to take a break!", every=1200)
```

Dynamic task (agent executes each time):
```
cron(action="add", name="github-stars", message="Check Peiiii/nextclaw GitHub stars and report", every=600)
```

One-time reminder:
```
cron(action="add", name="wechat-follow-up", message="At the scheduled time, send a WeChat message to the current chat saying: \"我 5 分钟后到。\"", at="2026-03-31T18:05:00+08:00")
```

List/remove:
```
cron(action="list")
cron(action="disable", jobId="abc123")
cron(action="enable", jobId="abc123")
cron(action="remove", jobId="abc123")
```

## Time Expressions

| User says | Parameters |
|-----------|------------|
| in 5 minutes | at: "<convert to exact ISO time with timezone>" |
| today at 6pm | at: "<convert to exact ISO time with timezone>" |
| tomorrow morning once | at: "<convert to exact ISO time with timezone>" |
| every 20 minutes | every: 1200 |
| every hour | every: 3600 |
| every day at 8am | cron: "0 8 * * *" |
| weekdays at 5pm | cron: "0 17 * * 1-5" |
