---
"@nextclaw/server": patch
"nextclaw": patch
---

Replace the UI API CORS middleware with an explicit implementation that avoids both `hono/cors` and the `HonoRequest.header()` hot path on long-running Node servers, while also preventing stale remote runtime state from reporting dead services as connected.
