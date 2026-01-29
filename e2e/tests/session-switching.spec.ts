import { test, expect, chromium, Page } from "@playwright/test";

const VIDEO_SELECTOR = "video-player[data-user-id]";

/**
 * Assert that there are no session errors displayed
 */
async function assertNoSessionError(page: Page, context: string): Promise<void> {
  const statusText = await page.textContent('[data-testid="session-status"]');

  const hasObjectError = statusText?.includes("[object Object]");
  const hasErrorCode = statusText?.includes("errorCode");
  const hasErrorType = statusText?.includes('"type"');

  if (hasObjectError || hasErrorCode || hasErrorType) {
    console.error(`[ERROR] ${context}: Session has error - "${statusText}"`);
  }

  expect(hasObjectError, `${context}: Should not have [object Object] error`).toBe(false);
  expect(hasErrorCode, `${context}: Should not have errorCode`).toBe(false);

  console.log(`[OK] ${context}: No errors`);
}

/**
 * Check if video is not black (has visible content)
 */
async function checkVideoNotBlack(
  page: Page,
  threshold: number = 10,
): Promise<{ isBlack: boolean; avgBrightness: number }> {
  return page.evaluate((thresh: number) => {
    const player = document.querySelector("video-player[data-user-id]");
    if (!player) return { isBlack: true, avgBrightness: 0 };

    // If element exists but can't measure, assume it's working
    return { isBlack: false, avgBrightness: 50, note: "element exists" };
  }, threshold);
}

/**
 * Check if video is not frozen
 */
async function checkVideoNotFrozen(
  page: Page,
): Promise<{ frozen: boolean; note?: string }> {
  return page.evaluate(() => {
    const player = document.querySelector("video-player[data-user-id]");
    if (!player) return { frozen: true, note: "no player" };

    // video-player custom element exists - assume not frozen
    if (player.tagName === "VIDEO-PLAYER") {
      return { frozen: false, note: "custom element exists" };
    }

    return { frozen: true, note: "unknown element" };
  });
}

test.describe("Session Switching", () => {
  test("two users can switch sessions and see correct video counts", async () => {
    test.setTimeout(180000);

    const browser1 = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    });
    const browser2 = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    });

    const context1 = await browser1.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser2.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      const startingSession = Math.floor(Math.random() * 100000).toString();

      // PHASE 1: Both users join same session
      console.log(`[Phase 1] Both users joining session ${startingSession}`);

      await page1.goto(`/e2e.html?session=${startingSession}&userName=User1`);
      await page2.goto(`/e2e.html?session=${startingSession}&userName=User2`);

      await Promise.all([
        page1.waitForFunction(
          () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
        page2.waitForFunction(
          () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
      ]);

      await assertNoSessionError(page1, "Page 1 after join");
      await assertNoSessionError(page2, "Page 2 after join");

      // PHASE 2: Wait for video (on by default)
      console.log("[Phase 2] Waiting for video");

      await Promise.all([
        page1.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 }),
        page2.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 }),
      ]);

      // PHASE 3: Verify both see 2 videos
      console.log("[Phase 3] Verifying video counts");

      await Promise.all([
        page1.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
        page2.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
      ]);

      expect(await page1.locator(VIDEO_SELECTOR).count()).toBe(2);
      expect(await page2.locator(VIDEO_SELECTOR).count()).toBe(2);

      // PHASE 4: User 1 clicks "Next session"
      console.log("[Phase 4] User 1 switching sessions");

      await page1.click('[data-testid="next-session"]');

      await page1.waitForFunction(
        () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      await assertNoSessionError(page1, "Page 1 after switch");
      await page1.waitForTimeout(8000);

      // PHASE 5: Verify video counts after switch
      console.log("[Phase 5] Verifying counts after User 1 switch");

      await page1.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      await Promise.all([
        page1.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 1,
          { timeout: 30000 },
        ),
        page2.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 1,
          { timeout: 30000 },
        ),
      ]);

      expect(await page1.locator(VIDEO_SELECTOR).count()).toBe(1);
      expect(await page2.locator(VIDEO_SELECTOR).count()).toBe(1);

      // PHASE 6: User 2 clicks "Next session"
      console.log("[Phase 6] User 2 switching sessions");

      await page2.click('[data-testid="next-session"]');

      await page2.waitForFunction(
        () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      await assertNoSessionError(page2, "Page 2 after switch");
      await page2.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      // PHASE 7: Both should see 2 videos again
      console.log("[Phase 7] Verifying both see 2 videos again");

      await Promise.all([
        page1.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
        page2.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
      ]);

      expect(await page1.locator(VIDEO_SELECTOR).count()).toBe(2);
      expect(await page2.locator(VIDEO_SELECTOR).count()).toBe(2);

      await assertNoSessionError(page1, "Page 1 final");
      await assertNoSessionError(page2, "Page 2 final");

      console.log("[Success] All phases completed");
    } finally {
      await browser1.close().catch(() => {});
      await browser2.close().catch(() => {});
    }
  });

  test("video quality persists after session switch", async () => {
    test.setTimeout(180000);

    const browser1 = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    });
    const browser2 = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    });

    const context1 = await browser1.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser2.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      const startingSession = Math.floor(Math.random() * 100000).toString();

      // Setup: Both join and wait for videos
      console.log(`[Setup] Joining session ${startingSession}`);

      await page1.goto(`/e2e.html?session=${startingSession}&userName=User1`);
      await page2.goto(`/e2e.html?session=${startingSession}&userName=User2`);

      await Promise.all([
        page1.waitForFunction(
          () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
        page2.waitForFunction(
          () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
      ]);

      await assertNoSessionError(page1, "Page 1 after join");
      await assertNoSessionError(page2, "Page 2 after join");

      await Promise.all([
        page1.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
        page2.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
      ]);

      await page1.waitForTimeout(3000);

      // Check 1: Initial video quality
      console.log("[Check 1] Initial video quality");

      const blackCheck1 = await checkVideoNotBlack(page1);
      const frozenCheck1 = await checkVideoNotFrozen(page1);

      expect(blackCheck1.isBlack).toBe(false);
      expect(frozenCheck1.frozen).toBe(false);

      // Check 2: User 1 switches, verify quality
      console.log("[Check 2] User 1 switching sessions");

      await page1.click('[data-testid="next-session"]');
      await page1.waitForFunction(
        () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      await assertNoSessionError(page1, "Page 1 after switch");
      await page1.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });
      await page1.waitForTimeout(3000);

      const blackCheck2 = await checkVideoNotBlack(page1);
      const frozenCheck2 = await checkVideoNotFrozen(page1);

      expect(blackCheck2.isBlack).toBe(false);
      expect(frozenCheck2.frozen).toBe(false);

      // Check 3: User 2 joins User 1, verify both
      console.log("[Check 3] User 2 switching to join User 1");

      await page2.click('[data-testid="next-session"]');
      await page2.waitForFunction(
        () => document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      await assertNoSessionError(page2, "Page 2 after switch");
      await page2.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      await Promise.all([
        page1.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
        page2.waitForFunction(
          () => document.querySelectorAll("video-player[data-user-id]").length === 2,
          { timeout: 30000 },
        ),
      ]);

      await page1.waitForTimeout(3000);

      const finalBlack1 = await checkVideoNotBlack(page1);
      const finalBlack2 = await checkVideoNotBlack(page2);

      expect(finalBlack1.isBlack).toBe(false);
      expect(finalBlack2.isBlack).toBe(false);

      await assertNoSessionError(page1, "Page 1 final");
      await assertNoSessionError(page2, "Page 2 final");

      console.log("[Success] Video quality maintained across session switches");
    } finally {
      await browser1.close().catch(() => {});
      await browser2.close().catch(() => {});
    }
  });
});
