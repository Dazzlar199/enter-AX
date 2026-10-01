import { chromium } from "@playwright/test";
const b = await chromium.launch();
const hide = "nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }";
const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const q = await c2.newPage();
q.on("console", m => { if (m.type()==="error") console.log("ERR", q.url(), m.text().slice(0,200)); });
for (const [path, file] of [["/agency/pipeline", "pipeline.png"], ["/talent/onboarding", "onboarding.png"], ["/agency/discover", "discover.png"]]) {
  await q.goto("http://127.0.0.1:3001" + path, { waitUntil: "networkidle" });
  await q.addStyleTag({ content: hide });
  await q.waitForTimeout(800);
  await q.screenshot({ path: `public/images/landing/${file}`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
}
await b.close();
