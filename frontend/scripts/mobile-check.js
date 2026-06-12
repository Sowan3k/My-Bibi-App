/* Mobile/tablet visual check — runs against the dev server with a TEMP vault.
 * Creates a test user, seeds a little content, screenshots key pages at
 * phone (390x844) and tablet (820x1180) sizes into scripts/shots/.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const API = "http://localhost:8000";
const APP = "http://localhost:3000";
const OUT = path.join(__dirname, "shots");

async function api(token, method, url, body) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // --- seed account + content (temp vault, safe) ---
  const EMAIL = "test@example.com";
  let token;
  try {
    const setup = await api(null, "POST", "/api/auth/setup", {
      name: "Sowan",
      email: EMAIL,
      password: "testpass123",
    });
    token = setup.access_token;
    console.log("created test user");
  } catch (e) {
    console.log("setup said:", e.message.slice(0, 120));
    const form = new URLSearchParams({ username: EMAIL, password: "testpass123" });
    const res = await fetch(`${API}/api/auth/login`, { method: "POST", body: form });
    const data = await res.json();
    token = data.access_token;
    console.log("logged in existing test user");
  }
  if (!token) throw new Error("no auth token — aborting");

  try {
    const m1 = await api(token, "POST", "/api/chat/messages", { content: "hey you 🥰 how was the standup?" });
    await api(token, "POST", "/api/chat/messages", { content: "also look at this https://example.com" });
    const m3 = await api(token, "POST", "/api/chat/messages", { content: "missing you. dinner at 8? I'm cooking your favourite pasta tonight and it's going to be amazing" });
    await api(token, "POST", `/api/chat/messages/${m1.id}/react`, { emoji: "❤️" });
    await api(token, "POST", `/api/dreams`, { title: "See the northern lights", emoji: "✨", description: "Iceland, someday soon" });
    const fd = new URLSearchParams();
    console.log("seeded content");
  } catch (e) {
    console.log("seed skipped:", e.message.slice(0, 80));
  }

  const browser = await chromium.launch();

  async function shoot(viewport, label, routes, { onboarding = false, dark = false } = {}) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await ctx.addInitScript(
      ([t, ob, dk]) => {
        localStorage.setItem("bibi_token", t);
        if (!ob) localStorage.setItem("bibi_onboarded", "1");
        else localStorage.removeItem("bibi_onboarded");
        localStorage.setItem("bibi_theme_mode", dk ? "dark" : "light");
      },
      [token, onboarding, dark]
    );
    const page = await ctx.newPage();
    for (const route of routes) {
      const name = `${label}-${route === "/" ? "landing" : route.replace(/\//g, "")}${onboarding ? "-onboarding" : ""}${dark ? "-dark" : ""}`;
      try {
        await page.goto(`${APP}${route}`, { waitUntil: "load", timeout: 120000 });
        await page.waitForTimeout(2500); // let animations settle / data load
        await page.screenshot({ path: path.join(OUT, `${name}.png`) });
        console.log("shot:", name);
      } catch (e) {
        console.log("FAILED:", name, e.message.slice(0, 100));
      }
    }
    await ctx.close();
  }

  const phone = { width: 390, height: 844 };
  const tablet = { width: 820, height: 1180 };
  const desktop = { width: 1440, height: 900 };

  // Onboarding overlay (phone)
  await shoot(phone, "phone", ["/us"], { onboarding: true });
  // Main sweep (phone)
  await shoot(phone, "phone", [
    "/",
    "/login",
    "/us",
    "/memory",
    "/bloom",
    "/little-things",
    "/capsules",
    "/letters",
    "/dreams",
    "/settings",
    "/help",
  ]);
  // Tablet spot checks
  await shoot(tablet, "tablet", ["/us", "/memory", "/settings"]);
  // Desktop shots for README (light + dark)
  await shoot(desktop, "desktop", ["/us", "/memory", "/bloom", "/little-things"]);
  await shoot(desktop, "desktop", ["/us", "/memory"], { dark: true });
  await shoot(phone, "phone", ["/us"], { dark: true });

  await browser.close();
  console.log("DONE");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
