import { test, expect } from "@playwright/test";
import { generateTestTopic } from "../fixtures/jwt-helper";
import { joinSession } from "../fixtures/zoom-session";

test.describe("Multi-User Sessions", () => {
  test("two users can join the same session", async ({ browser }) => {
    const topic = generateTestTopic();

    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both users join the same session with unique userNames
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");

      // Verify both are in session
      const status1 = await page1.textContent('[data-testid="session-status"]');
      const status2 = await page2.textContent('[data-testid="session-status"]');

      expect(status1).toContain("joined");
      expect(status2).toContain("joined");
    } finally {
      await context1.close().catch(() => { });
      await context2.close().catch(() => { });
    }
  });

  test("users can see each other when video is enabled", async ({ browserName }) => {
    test.setTimeout(120000); // Increase timeout for multi-user test
    const topic = generateTestTopic();
    const { chromium } = await import("@playwright/test");

    // Fake camera args required for CI
    const launchArgs = [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ];

    // Launch TWO separate browser instances (not contexts)
    // Zoom SDK needs isolated browser processes to work properly
    const browser1 = await chromium.launch({ args: launchArgs });
    const browser2 = await chromium.launch({ args: launchArgs });

    const context1 = await browser1.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser2.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both users join the same session with unique userNames
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");

      // Video is on by default, wait for video elements to appear
      await page1.waitForSelector("video-player[data-user-id]", { timeout: 15000 });
      await page2.waitForSelector("video-player[data-user-id]", { timeout: 15000 });

      // Wait for videos to propagate between users
      await page1.waitForTimeout(8000);

      // Both should see 2 videos (their own + the other user's)
      const videoCountPage1 = await page1.locator("video-player[data-user-id]").count();
      const videoCountPage2 = await page2.locator("video-player[data-user-id]").count();

      expect(videoCountPage1).toBe(2);
      expect(videoCountPage2).toBe(2);
    } finally {
      await browser1.close().catch(() => { });
      await browser2.close().catch(() => { });
    }
  });

  test("three users can join the same session", async ({ browserName }) => {
    test.setTimeout(150000); // Increase timeout for 3-user test
    const topic = generateTestTopic();
    const { chromium } = await import("@playwright/test");

    // Fake camera args required for CI
    const launchArgs = [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ];

    // Launch THREE separate browser instances (not contexts)
    // Zoom SDK needs isolated browser processes to work properly
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
      // All three users join the same session with unique userNames
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");
      await joinSession(page3, topic, "User3");

      // Video is on by default, wait for video elements to appear on each page
      await Promise.all([
        page1.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
        page2.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
        page3.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
      ]);

      // Give more time for video to propagate across all 3 users
      await page1.waitForTimeout(12000);

      // Each should see 3 videos
      const count1 = await page1.locator("video-player[data-user-id]").count();
      const count2 = await page2.locator("video-player[data-user-id]").count();
      const count3 = await page3.locator("video-player[data-user-id]").count();

      expect(count1).toBe(3);
      expect(count2).toBe(3);
      expect(count3).toBe(3);
    } finally {
      await browser1.close().catch(() => { });
      await browser2.close().catch(() => { });
      await browser3.close().catch(() => { });
    }
  });

  test("when one user leaves, others remain in session", async ({ browser }) => {
    const topic = generateTestTopic();

    const context1 = await browser.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both users join the same session with unique userNames
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");

      // Close user 1's context (simulating leaving)
      await context1.close().catch(() => { });

      // Wait a bit
      await page2.waitForTimeout(2000);

      // User 2 should still be in session
      const status2 = await page2.textContent('[data-testid="session-status"]');
      expect(status2).toContain("joined");
    } finally {
      await context2.close().catch(() => { });
    }
  });
});
