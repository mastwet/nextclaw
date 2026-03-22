type BrowserAuthPageState = "pending" | "authorized" | "expired" | "missing";

type RenderBrowserAuthPageParams = {
  sessionId: string;
  pageState: BrowserAuthPageState;
  expiresAt: string | null;
  email?: string;
  maskedEmail?: string;
  errorMessage?: string;
  successMessage?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getHeading(pageState: BrowserAuthPageState): {
  title: string;
  subtitle: string;
} {
  if (pageState === "authorized") {
    return {
      title: "Device authorized",
      subtitle: "Return to NextClaw. This browser page can be closed now.",
    };
  }
  if (pageState === "expired") {
    return {
      title: "Authorization expired",
      subtitle: "Return to NextClaw and start the authorization again.",
    };
  }
  if (pageState === "missing") {
    return {
      title: "Authorization not found",
      subtitle: "This device authorization request is no longer valid.",
    };
  }
  return {
    title: "Authorize this NextClaw device",
    subtitle: "Sign in with your NextClaw Account to connect the local device.",
  };
}

function renderPendingContent(params: RenderBrowserAuthPageParams): string {
  const emailValue = escapeHtml(params.email ?? "");
  const maskedEmail = params.maskedEmail ? escapeHtml(params.maskedEmail) : "";
  const expiresText = params.expiresAt
    ? escapeHtml(new Date(params.expiresAt).toLocaleString("en-US"))
    : "-";
  const errorNotice = params.errorMessage
    ? `<div class="notice error">${escapeHtml(params.errorMessage)}</div>`
    : "";
  const successNotice = params.successMessage
    ? `<div class="notice success">${escapeHtml(params.successMessage)}</div>`
    : "";
  const verificationSection = params.email
    ? `
      <div class="section">
        <p class="section-label">Check your inbox</p>
        <p class="section-copy">We sent a 6-digit code to <strong>${maskedEmail || emailValue}</strong>.</p>
        <form method="post" action="/platform/auth/browser/verify-code" class="auth-form">
          <input type="hidden" name="sessionId" value="${escapeHtml(params.sessionId)}" />
          <input type="hidden" name="email" value="${emailValue}" />
          <label>
            <span>Verification code</span>
            <input type="text" inputmode="numeric" name="code" placeholder="123456" required />
          </label>
          <button type="submit">Authorize device</button>
        </form>
      </div>
      <div class="secondary-actions">
        <form method="post" action="/platform/auth/browser/send-code">
          <input type="hidden" name="sessionId" value="${escapeHtml(params.sessionId)}" />
          <input type="hidden" name="email" value="${emailValue}" />
          <button type="submit" class="ghost-button">Resend code</button>
        </form>
      </div>
    `
    : "";

  return `
    ${errorNotice}
    ${successNotice}
    <div class="section">
      <p class="section-label">NextClaw Account</p>
      <p class="section-copy">Enter your email to receive a verification code. If this email is new, the account will be created automatically after verification.</p>
      <form method="post" action="/platform/auth/browser/send-code" class="auth-form">
        <input type="hidden" name="sessionId" value="${escapeHtml(params.sessionId)}" />
        <label>
          <span>Email</span>
          <input type="email" name="email" value="${emailValue}" placeholder="name@example.com" required />
        </label>
        <button type="submit">${params.email ? "Send a new code" : "Send verification code"}</button>
      </form>
    </div>
    ${verificationSection}
    <p class="meta">This device authorization expires at ${expiresText}.</p>
  `;
}

function renderResolvedContent(params: RenderBrowserAuthPageParams, subtitle: string): string {
  const errorNotice = params.errorMessage
    ? `<div class="notice error">${escapeHtml(params.errorMessage)}</div>`
    : "";
  const successNotice = params.successMessage
    ? `<div class="notice success">${escapeHtml(params.successMessage)}</div>`
    : "";
  return `
    ${errorNotice}
    ${successNotice}
    <div class="state-card">
      <p>${escapeHtml(subtitle)}</p>
      <p class="meta">Session ${escapeHtml(params.sessionId.slice(0, 10))}...</p>
    </div>
  `;
}

export function renderBrowserAuthPage(params: RenderBrowserAuthPageParams): Response {
  const { title, subtitle } = getHeading(params.pageState);
  const content = params.pageState === "pending"
    ? renderPendingContent(params)
    : renderResolvedContent(params, subtitle);

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; font-family: "SF Pro Text", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif; background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.18) 0%, transparent 34%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%); color: #111827; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .shell { width: 100%; max-width: 520px; border-radius: 32px; background: rgba(255, 255, 255, 0.94); border: 1px solid rgba(209, 213, 219, 0.9); box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12); overflow: hidden; }
      .hero { padding: 28px 28px 22px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(37, 99, 235, 0.96) 100%); color: white; }
      .eyebrow { margin: 0 0 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; opacity: 0.74; }
      h1 { margin: 0; font-size: 30px; line-height: 1.08; letter-spacing: -0.02em; }
      .hero p { margin: 14px 0 0; color: rgba(255, 255, 255, 0.82); line-height: 1.7; }
      .body { padding: 24px 28px 28px; }
      .section { border-radius: 24px; background: #f8fafc; border: 1px solid #e5e7eb; padding: 18px; }
      .section + .section { margin-top: 14px; }
      .section-label { margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #2563eb; }
      .section-copy { margin: 0 0 16px; color: #4b5563; line-height: 1.7; }
      .auth-form { display: grid; gap: 14px; }
      label { display: grid; gap: 8px; font-size: 14px; font-weight: 600; color: #111827; }
      input { width: 100%; border: 1px solid #d1d5db; border-radius: 16px; padding: 14px 16px; font-size: 15px; color: #111827; background: white; }
      input:focus { outline: 2px solid rgba(37, 99, 235, 0.18); border-color: #2563eb; }
      button { border: 0; border-radius: 16px; padding: 14px 18px; font-size: 15px; font-weight: 700; color: white; background: linear-gradient(135deg, #111827 0%, #2563eb 100%); cursor: pointer; }
      .ghost-button { background: white; color: #111827; border: 1px solid #d1d5db; }
      .secondary-actions { margin-top: 12px; }
      .notice { border-radius: 18px; padding: 14px 16px; margin-bottom: 12px; line-height: 1.6; }
      .notice.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      .notice.success { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
      .state-card { border-radius: 24px; border: 1px solid #e5e7eb; background: #f8fafc; padding: 18px; line-height: 1.7; }
      .meta { margin: 14px 0 0; font-size: 12px; color: #6b7280; }
      strong { color: #111827; }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="hero">
        <p class="eyebrow">NextClaw Platform</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="body">${content}</div>
    </main>
  </body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
