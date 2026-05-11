import { test } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test("Home screenshot — full page + viewport", async ({ page }) => {
  await loginAsTestUser(page);
  await page.waitForURL(/\/home/);
  await page.waitForTimeout(1500);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "/tmp/home-viewport.png",
    fullPage: false,
  });
  await page.screenshot({
    path: "/tmp/home-fullpage.png",
    fullPage: true,
  });
  console.log("SAVED: /tmp/home-viewport.png /tmp/home-fullpage.png");
});
