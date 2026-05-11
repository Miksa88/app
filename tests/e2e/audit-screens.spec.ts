import { test } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

const SCREENS = [
  { path: "/home", name: "01-home" },
  { path: "/gym", name: "02-gym" },
  { path: "/food", name: "03-food" },
  { path: "/progress", name: "04-progress" },
  { path: "/profile", name: "05-profile" },
  { path: "/milestones", name: "06-milestones" },
  { path: "/chat", name: "07-chat" },
];

test("Visual audit — capture all client screens", async ({ page }) => {
  await loginAsTestUser(page);
  await page.waitForURL(/\/home/);
  await page.setViewportSize({ width: 390, height: 844 });

  for (const s of SCREENS) {
    await page.goto(s.path);
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `/tmp/audit-${s.name}.png`,
      fullPage: false,
    });
    console.log(`SAVED: /tmp/audit-${s.name}.png (${s.path})`);
  }
});
