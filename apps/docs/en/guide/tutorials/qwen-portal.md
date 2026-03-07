# Qwen Portal Setup Tutorial (Beginner-Friendly)

If you want a **free, easy first provider** to get NextClaw running, `Qwen Portal` is one of the best starting options.

> Note: You do not need a separate pre-existing Qwen account. Open `chat.qwen.ai` and use any sign-up or sign-in method shown there (for example email, Google, or GitHub). If Qwen changes the login flow later, follow what the page shows.

This tutorial helps you finish four things:

1. Open the Provider settings page in NextClaw
2. Complete Qwen authorization in your browser
3. Enable `qwen-portal` in NextClaw
4. Send a real test message to confirm it works

## Prerequisites

- NextClaw is installed and can be opened.
- Your machine can access `chat.qwen.ai`.
- You can access `chat.qwen.ai` and complete sign-up or sign-in with any method shown on the page.

If you use NextClaw from CLI, start the local UI first:

```bash
nextclaw start --ui-port 18891
```

Then open:

- `http://127.0.0.1:18891`

## 1) Open the Providers page

Inside NextClaw:

1. Open the `Providers` page.
2. Find `Qwen Portal` in the provider list.
3. Open its configuration card.

You should see a built-in authorization section, so you do not need to go hunt for a third-party API key first.

## 2) Click `Authorize in Browser`

In the `Qwen Portal` card:

1. Click `Authorize in Browser`.
2. NextClaw opens your browser and jumps to the Qwen authorization page.
3. Sign in and complete the authorization steps.

Normally:

- You do not need to manually fill in an API key.
- NextClaw stores the credential automatically after authorization.
- `apiBase` is also filled with the default value: `https://portal.qwen.ai/v1`.

## 3) Return to NextClaw and wait for completion

After the browser flow is done, go back to NextClaw:

1. Keep the current `Qwen Portal` page open.
2. Wait until the UI shows `Authorization completed`.
3. Confirm the provider status becomes configured.

If you already signed in with Qwen CLI on this machine, you can also use:

- `Import From Qwen CLI`

That imports credentials from `~/.qwen/oauth_creds.json`, which is handy if you already use the Qwen CLI.

## 4) Select a model and send a test message

After authorization, do a quick real test:

1. Open the chat page.
2. Select `qwen-portal/coder-model` in the model picker.
3. Send this message:

```text
Please reply exactly: QWEN-PORTAL-OK
```

Expected result:

- The model replies with `QWEN-PORTAL-OK`, or a short equivalent response.

For an even simpler check, you can also send:

```text
Reply with number only: 1+1=
```

Expected result:

- `2`

## Who this is for

`Qwen Portal` is a great fit if you:

- are new to NextClaw and do not want to study API platforms first;
- want to quickly verify chat, tools, or workflows end to end;
- want to start free before switching to another provider later.

## Common questions

### Why can't I see `Qwen Portal`?

- Make sure your NextClaw version includes the built-in `qwen-portal` provider.
- If you are on an older version, upgrade first.

### I finished browser login, but NextClaw still does not show success

- Wait a few seconds on the same page; the UI needs a short polling cycle.
- Do not close the `Qwen Portal` config page immediately.
- If needed, start the browser authorization again.

### Do I need to manually fill `API Key`?

- Usually no.
- NextClaw writes the credential automatically after browser authorization.

### Do I need to manually fill `API Base`?

- Usually no.
- The default is `https://portal.qwen.ai/v1`.

### What does `Import From Qwen CLI` do?

- If you already signed in with Qwen CLI, NextClaw can reuse that local credential.
- If you never installed Qwen CLI, just ignore this button and use browser authorization.

## Related docs

- [Tutorial Hub](/en/guide/tutorials)
- [Configuration](/en/guide/configuration)
- [Model Selection Guide](/en/guide/model-selection)
- [Troubleshooting](/en/guide/troubleshooting)
