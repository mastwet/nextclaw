#!/usr/bin/env node
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = (process.env.PLATFORM_CONSOLE_BASE_URL ?? "http://127.0.0.1:4173").replace(/\/+$/, "");

function okEnvelope(data) {
  return JSON.stringify({ ok: true, data });
}

async function fulfillJson(route, data) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: okEnvelope(data)
  });
}

async function assertDashboardFlow(browser) {
  const page = await browser.newPage({ locale: "en-US" });

  await page.route("**/platform/auth/me", async (route) => {
    await fulfillJson(route, {
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "user"
      }
    });
  });

  await page.route("**/platform/remote/instances", async (route) => {
    await fulfillJson(route, {
      items: [
        {
          id: "inst-1",
          displayName: "MacBook Pro",
          appVersion: "0.13.99",
          platform: "macOS",
          status: "online",
          lastSeenAt: "2026-03-23T09:00:00.000Z"
        }
      ]
    });
  });

  await page.route("**/platform/remote/quota", async (route) => {
    await fulfillJson(route, {
      dayKey: "2026-03-25",
      resetsAt: "2026-03-26T00:00:00.000Z",
      sessionRequestsPerMinute: 180,
      instanceConnectionsPerInstance: 10000,
      activeBrowserConnections: 2,
      workerRequests: {
        limit: 20000,
        used: 12,
        remaining: 19988
      },
      durableObjectRequests: {
        limit: 20000,
        used: 12.05,
        remaining: 19987.95
      }
    });
  });

  await page.route("**/platform/remote/instances/inst-1/shares", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillJson(route, { items: [] });
      return;
    }

    await fulfillJson(route, {
      id: "grant-1",
      instanceId: "inst-1",
      status: "active",
      createdAt: "2026-03-23T09:00:00.000Z",
      expiresAt: "2026-03-24T09:00:00.000Z",
      shareUrl: "https://r-demo.claw.cool",
      activeSessionCount: 0
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("nextclaw.platform.token", "demo-token");
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const bodyText = await page.locator("body").innerText();

  if (!bodyText.includes("My Instances")) {
    throw new Error("Dashboard did not render the English remote instances section.");
  }
  if (!bodyText.includes("Remote Quota & Usage")) {
    throw new Error("Dashboard did not render the remote quota section.");
  }
  if (!bodyText.includes("Daily Worker requests")) {
    throw new Error("Dashboard did not render worker quota metrics.");
  }
  if (!bodyText.includes("COMING SOON")) {
    throw new Error("Dashboard did not render the English billing coming-soon badge.");
  }
  if (bodyText.includes("Recharge") || bodyText.includes("Ledger")) {
    throw new Error("Dashboard still exposes billing details that should stay hidden.");
  }

  await page.getByRole("button", { name: "中文" }).click();
  await page.waitForTimeout(300);

  const zhText = await page.locator("body").innerText();
  if (!zhText.includes("我的实例")) {
    throw new Error("Dashboard did not switch to Chinese.");
  }
  if (!zhText.includes("Remote 额度与用量")) {
    throw new Error("Dashboard did not switch the quota card to Chinese.");
  }
  if (!zhText.includes("即将上线")) {
    throw new Error("Dashboard did not render the Chinese billing badge.");
  }

  await page.close();
}

async function assertLoginFlow(browser) {
  const page = await browser.newPage({ locale: "en-US" });

  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const loginEn = await page.locator("body").innerText();

  if (!loginEn.includes("Sign in to NextClaw Web and continue your instances and agent workflows.")) {
    throw new Error("Login page did not render the default English hero copy.");
  }

  await page.getByRole("button", { name: "中文" }).click();
  await page.waitForTimeout(300);

  const loginZh = await page.locator("body").innerText();
  if (!loginZh.includes("登录 NextClaw Web，继续你的实例与 Agent 工作流。")) {
    throw new Error("Login page did not switch to Chinese.");
  }

  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await assertDashboardFlow(browser);
    await assertLoginFlow(browser);
    console.log(`[platform-console-smoke] passed for ${baseUrl}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("[platform-console-smoke] failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
