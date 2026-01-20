import { test, expect, chromium } from "@playwright/test";
import { isBlackScreen, getColorStats } from "../helpers/screenshot-analysis";

const VIDEO_SELECTOR = "video-player[data-user-id]";

/**
 * Check if screenshot is white/very bright (indicating rendering issue)
 */
async function isWhiteScreen(
  screenshot: Buffer,
  whiteThreshold: number = 240,
  whitePercentageThreshold: number = 90,
): Promise<{ isWhite: boolean; whitePercentage: number; avgBrightness: number }> {
  const { PNG } = await import("pngjs");
  const png = PNG.sync.read(screenshot);
  const { width, height, data } = png;
  const totalPixels = width * height;
  let whitePixels = 0;
  let totalBrightness = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;

    // Check if pixel is white/very bright
    if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
      whitePixels++;
    }
  }

  const whitePercentage = (whitePixels / totalPixels) * 100;
  const avgBrightness = totalBrightness / totalPixels;

  return {
    isWhite: whitePercentage >= whitePercentageThreshold,
    whitePercentage,
    avgBrightness,
  };
}

test.describe("Next Session Video Quality Bug", () => {
  /**
   * This test reproduces the white screen bug when switching sessions.
   *
   * Steps:
   * 1. Join first session with video enabled
   * 2. Verify video renders correctly (not white, not black)
   * 3. Click "Next session" to switch to a new session
   * 4. Wait for new session to join
   * 5. Turn video on again
   * 6. Verify video renders - THIS SHOULD FAIL with white screen
   */
  test("video should render correctly after clicking next session", async () => {
    test.setTimeout(120000); // 2 minutes

    const browser = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    });

    const context = await browser.newContext({
      permissions: ["camera", "microphone"],
    });

    const page = await context.newPage();

    try {
      // Generate unique session to avoid conflicts
      const startingSession = Math.floor(Math.random() * 100000).toString();

      // ============================================
      // PHASE 1: Join first session
      // ============================================
      console.log(`[Phase 1] Joining session ${startingSession}`);

      await page.goto(`/e2e.html?session=${startingSession}&userName=TestUser`);

      // Wait for session to connect
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      const status1 = await page.textContent('[data-testid="session-status"]');
      expect(status1).toContain("joined");
      console.log(`[Phase 1] Joined session: ${status1}`);

      // ============================================
      // PHASE 2: Wait for video (on by default) and verify quality
      // ============================================
      console.log("[Phase 2] Waiting for video (on by default)");

      await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      // Wait for video to fully render
      await page.waitForTimeout(3000);

      // Take screenshot and verify video quality
      const videoPlayer1 = page.locator(VIDEO_SELECTOR).first();
      const screenshot1 = await videoPlayer1.screenshot();

      const blackCheck1 = await isBlackScreen(screenshot1);
      const whiteCheck1 = await isWhiteScreen(screenshot1);
      const colorStats1 = await getColorStats(screenshot1);

      console.log("[Phase 2] First session video stats:");
      console.log(`  - Is black: ${blackCheck1}`);
      console.log(
        `  - Is white: ${whiteCheck1.isWhite} (${whiteCheck1.whitePercentage.toFixed(1)}%)`,
      );
      console.log(`  - Avg brightness: ${colorStats1.avgBrightness.toFixed(2)}`);
      console.log(
        `  - RGB: R=${colorStats1.avgRed.toFixed(0)}, G=${colorStats1.avgGreen.toFixed(0)}, B=${colorStats1.avgBlue.toFixed(0)}`,
      );

      // First session video should NOT be black or white
      expect(blackCheck1, "First session video should not be black").toBe(false);
      expect(whiteCheck1.isWhite, "First session video should not be white").toBe(false);

      console.log("[Phase 2] ✓ First session video quality verified");

      // ============================================
      // PHASE 3: Click "Next session"
      // ============================================
      console.log('[Phase 3] Clicking "Next session"');

      await page.click('[data-testid="next-session"]');

      // Wait for new session to connect
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 30000 },
      );

      const status2 = await page.textContent('[data-testid="session-status"]');
      expect(status2).toContain("joined");
      console.log(`[Phase 3] Joined new session: ${status2}`);

      // ============================================
      // PHASE 4: Wait for video in new session (on by default)
      // ============================================
      console.log("[Phase 4] Waiting for video in new session (on by default)");

      await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      // Wait for video to fully render
      await page.waitForTimeout(3000);

      // ============================================
      // PHASE 5: Verify video quality in new session
      // THIS IS WHERE THE BUG MANIFESTS - video is white
      // ============================================
      console.log("[Phase 5] Verifying video quality in new session");

      const videoPlayer2 = page.locator(VIDEO_SELECTOR).first();
      const screenshot2 = await videoPlayer2.screenshot();

      const blackCheck2 = await isBlackScreen(screenshot2);
      const whiteCheck2 = await isWhiteScreen(screenshot2);
      const colorStats2 = await getColorStats(screenshot2);

      console.log("[Phase 5] Second session video stats:");
      console.log(`  - Is black: ${blackCheck2}`);
      console.log(
        `  - Is white: ${whiteCheck2.isWhite} (${whiteCheck2.whitePercentage.toFixed(1)}%)`,
      );
      console.log(`  - Avg brightness: ${colorStats2.avgBrightness.toFixed(2)}`);
      console.log(
        `  - RGB: R=${colorStats2.avgRed.toFixed(0)}, G=${colorStats2.avgGreen.toFixed(0)}, B=${colorStats2.avgBlue.toFixed(0)}`,
      );

      // Second session video should NOT be black or white
      // This is where the bug should be caught - video renders white
      expect(blackCheck2, "Second session video should not be black").toBe(false);
      expect(
        whiteCheck2.isWhite,
        "Second session video should not be white (BUG: white screen after next session)",
      ).toBe(false);

      // Additional check: brightness should be reasonable (not too high = white, not too low = black)
      expect(
        colorStats2.avgBrightness,
        "Video brightness should be in normal range",
      ).toBeGreaterThan(20);
      expect(
        colorStats2.avgBrightness,
        "Video brightness should not be too high (white)",
      ).toBeLessThan(240);

      console.log("[Phase 5] ✓ Second session video quality verified");
      console.log("[Success] Test passed - video renders correctly after session switch");
    } finally {
      await browser.close().catch(() => { });
    }
  });

  /**
   * Additional test: Compare video quality before and after session switch
   */
  test("video quality should be consistent before and after session switch", async () => {
    test.setTimeout(120000);

    const browser = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    });

    const context = await browser.newContext({
      permissions: ["camera", "microphone"],
    });

    const page = await context.newPage();

    try {
      const startingSession = Math.floor(Math.random() * 100000).toString();

      // Join first session
      await page.goto(`/e2e.html?session=${startingSession}&userName=TestUser`);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      // Video is on by default, wait for it
      await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Capture first session stats
      const videoPlayer1 = page.locator(VIDEO_SELECTOR).first();
      const screenshot1 = await videoPlayer1.screenshot();
      const stats1 = await getColorStats(screenshot1);

      console.log("First session stats:", {
        brightness: stats1.avgBrightness.toFixed(2),
        r: stats1.avgRed.toFixed(0),
        g: stats1.avgGreen.toFixed(0),
        b: stats1.avgBlue.toFixed(0),
      });

      // Switch to next session
      await page.click('[data-testid="next-session"]');
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 30000 },
      );

      // Video is on by default, wait for it
      await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Capture second session stats
      const videoPlayer2 = page.locator(VIDEO_SELECTOR).first();
      const screenshot2 = await videoPlayer2.screenshot();
      const stats2 = await getColorStats(screenshot2);

      console.log("Second session stats:", {
        brightness: stats2.avgBrightness.toFixed(2),
        r: stats2.avgRed.toFixed(0),
        g: stats2.avgGreen.toFixed(0),
        b: stats2.avgBlue.toFixed(0),
      });

      // Compare: brightness should be similar (within reasonable range)
      // If second session is white, brightness will be ~255 vs normal ~50-150
      const brightnessDiff = Math.abs(stats1.avgBrightness - stats2.avgBrightness);

      console.log(`Brightness difference: ${brightnessDiff.toFixed(2)}`);

      // Allow some variance, but a white screen would have brightness ~255
      // while normal video from fake camera is typically 50-150
      expect(
        brightnessDiff,
        `Video brightness changed too much after session switch (${stats1.avgBrightness.toFixed(0)} -> ${stats2.avgBrightness.toFixed(0)}). This indicates a rendering bug.`,
      ).toBeLessThan(100);

      console.log("✓ Video quality consistent across session switch");
    } finally {
      await browser.close().catch(() => { });
    }
  });
});
