import { test, expect } from "@playwright/test";
import { generateTestTopic } from "../fixtures/jwt-helper";
import { joinSession } from "../fixtures/zoom-session";

test.describe("Multi-User Sessions", () => {
  test("users can see each other when video is enabled", async () => {
    test.setTimeout(120000);
    const topic = generateTestTopic();
    const { chromium } = await import("@playwright/test");

    const launchArgs = [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ];

    // Launch TWO separate browser instances (Zoom SDK needs isolated browser processes)
    const browser1 = await chromium.launch({ args: launchArgs });
    const browser2 = await chromium.launch({ args: launchArgs });

    const context1 = await browser1.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser2.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");

      // Verify both joined
      expect(await page1.textContent('[data-testid="session-status"]')).toContain("joined");
      expect(await page2.textContent('[data-testid="session-status"]')).toContain("joined");

      // Video is on by default, wait for video elements
      await page1.waitForSelector("video-player[data-user-id]", { timeout: 15000 });
      await page2.waitForSelector("video-player[data-user-id]", { timeout: 15000 });

      // Wait for videos to propagate
      await page1.waitForTimeout(8000);

      // Both should see 2 videos
      expect(await page1.locator("video-player[data-user-id]").count()).toBe(2);
      expect(await page2.locator("video-player[data-user-id]").count()).toBe(2);
    } finally {
      await browser1.close().catch(() => {});
      await browser2.close().catch(() => {});
    }
  });

  test("three users can join the same session", async () => {
    test.setTimeout(150000);
    const topic = generateTestTopic();
    const { chromium } = await import("@playwright/test");

    const launchArgs = [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ];

    const browser1 = await chromium.launch({ args: launchArgs });
    const browser2 = await chromium.launch({ args: launchArgs });
    const browser3 = await chromium.launch({ args: launchArgs });

    const context1 = await browser1.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser2.newContext({ permissions: ["camera", "microphone"] });
    const context3 = await browser3.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");
      await joinSession(page3, topic, "User3");

      // Video is on by default
      await Promise.all([
        page1.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
        page2.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
        page3.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
      ]);

      // Wait for video propagation
      await page1.waitForTimeout(12000);

      // Each should see 3 videos
      expect(await page1.locator("video-player[data-user-id]").count()).toBe(3);
      expect(await page2.locator("video-player[data-user-id]").count()).toBe(3);
      expect(await page3.locator("video-player[data-user-id]").count()).toBe(3);
    } finally {
      await browser1.close().catch(() => {});
      await browser2.close().catch(() => {});
      await browser3.close().catch(() => {});
    }
  });

  test("when one user leaves, others remain in session", async ({ browser }) => {
    const topic = generateTestTopic();

    const context1 = await browser.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");

      // Close user 1's context (simulating leaving)
      await context1.close().catch(() => {});

      await page2.waitForTimeout(2000);

      // User 2 should still be in session
      expect(await page2.textContent('[data-testid="session-status"]')).toContain("joined");
    } finally {
      await context2.close().catch(() => {});
    }
  });
});
