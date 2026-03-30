---
name: cron
description: Schedule reminders and recurring tasks.
---

# Cron

Use the `cron` tool to schedule reminders or recurring tasks.

## Actions

- `add`: create a scheduled job
- `list`: list existing jobs
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

List/remove:
```
cron(action="list")
cron(action="remove", jobId="abc123")
```

## Time Expressions

| User says | Parameters |
|-----------|------------|
| every 20 minutes | every: 1200 |
| every hour | every: 3600 |
| every day at 8am | cron: "0 8 * * *" |
| weekdays at 5pm | cron: "0 17 * * 1-5" |
