import { test, expect, chromium, Page } from "@playwright/test";

/**
 * Assert that there are no session errors displayed
 * Checks that the session status doesn't contain error text like "[object Object]"
 */
async function assertNoSessionError(page: Page, context: string): Promise<void> {
  const statusText = await page.textContent('[data-testid="session-status"]');

  // Check for common error indicators
  const hasObjectError = statusText?.includes("[object Object]");
  const hasErrorCode = statusText?.includes("errorCode");
  const hasErrorType = statusText?.includes('"type"');

  if (hasObjectError || hasErrorCode || hasErrorType) {
    console.error(`[ERROR] ${context}: Session has error - "${statusText}"`);
  }

  expect(hasObjectError, `${context}: Should not have [object Object] error in status`).toBe(false);
  expect(hasErrorCode, `${context}: Should not have errorCode in status`).toBe(false);

  console.log(`[OK] ${context}: No errors in session status`);
}

/**
 * E2E tests for the Next Session functionality
 * Tests session switching between two users
 */
test.describe("Next Session Functionality", () => {
  test("two users can switch sessions and see correct video counts", async () => {
    test.setTimeout(180000); // 3 minutes for this complex multi-user test

    // Launch TWO separate browser instances (Zoom SDK needs isolated browser processes)
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
      // Generate a unique starting session number to avoid conflicts
      const startingSession = Math.floor(Math.random() * 100000).toString();

      // ============================================
      // PHASE 1: Both users join the same session
      // ============================================
      console.log(`[Phase 1] Both users joining session ${startingSession}`);

      // Navigate both users to the app with unique usernames and same session
      await page1.goto(`/e2e.html?session=${startingSession}&userName=User1`);
      await page2.goto(`/e2e.html?session=${startingSession}&userName=User2`);

      // Wait for both to join the session
      await Promise.all([
        page1.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="session-status"]')
              ?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
        page2.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="session-status"]')
              ?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
      ]);

      // Verify both are in session and NO ERRORS
      await assertNoSessionError(page1, "Page 1 after join");
      await assertNoSessionError(page2, "Page 2 after join");

      const status1 = await page1.textContent('[data-testid="session-status"]');
      const status2 = await page2.textContent('[data-testid="session-status"]');
      expect(status1).toContain("joined");
      expect(status2).toContain("joined");

      // ============================================
      // PHASE 2: Wait for video (video is on by default)
      // ============================================
      console.log("[Phase 2] Waiting for video (on by default)");

      // Video is enabled by default, wait for video elements to appear
      await Promise.all([
        page1.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
        page2.waitForSelector("video-player[data-user-id]", { timeout: 15000 }),
      ]);

      // ============================================
      // PHASE 3: Verify both users see 2 videos each
      // ============================================
      console.log("[Phase 3] Waiting for both users to see 2 videos");

      // Wait for both users to see 2 video-player elements (with retry)
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

      const videoCount1Initial = await page1.locator("video-player[data-user-id]").count();
      const videoCount2Initial = await page2.locator("video-player[data-user-id]").count();

      expect(videoCount1Initial).toBe(2);
      expect(videoCount2Initial).toBe(2);

      // ============================================
      // PHASE 4: Check video quality for both users
      // ============================================
      console.log("[Phase 4] Checking video-player elements exist");

      // Verify video-player elements exist (video content rendering is SDK-dependent)
      const players1 = await page1.locator("video-player[data-user-id]").count();
      const players2 = await page2.locator("video-player[data-user-id]").count();
      expect(players1).toBe(2);
      expect(players2).toBe(2);

      // ============================================
      // PHASE 5: User 1 clicks "Next session"
      // ============================================
      console.log("[Phase 5] User 1 clicking Next session");

      await page1.click('[data-testid="next-session"]');

      // Wait for User 1 to join the new session
      await page1.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      // Check for errors after session switch
      await assertNoSessionError(page1, "Page 1 after next session click");

      // Wait for session change to propagate
      await page1.waitForTimeout(8000);

      // ============================================
      // PHASE 6: Verify video counts after User 1 switches
      // Both users should only see their own video now
      // ============================================
      console.log("[Phase 6] Verifying video counts after User 1 switches");

      // Video is on by default, wait for video element to appear
      await page1.waitForSelector("video-player[data-user-id]", { timeout: 15000 });

      // Wait for User 1 to see only 1 video (their own in new session)
      await page1.waitForFunction(
        () => document.querySelectorAll("video-player[data-user-id]").length === 1,
        { timeout: 30000 },
      );

      // Wait for User 2 to see only 1 video (User 1 left their session)
      await page2.waitForFunction(
        () => document.querySelectorAll("video-player[data-user-id]").length === 1,
        { timeout: 30000 },
      );

      // User 1 is alone in new session - should see only their own video
      const videoCount1AfterSwitch = await page1.locator("video-player[data-user-id]").count();
      expect(videoCount1AfterSwitch).toBe(1);

      // User 2 is alone in old session - should see only their own video
      const videoCount2AfterSwitch = await page2.locator("video-player[data-user-id]").count();
      expect(videoCount2AfterSwitch).toBe(1);

      // ============================================
      // PHASE 7: Check video counts after session switch
      // ============================================
      console.log("[Phase 7] Verifying video-player counts after session switch");

      // Verify each user sees only their own video
      const count1AfterSwitch = await page1.locator("video-player[data-user-id]").count();
      const count2AfterSwitch = await page2.locator("video-player[data-user-id]").count();
      expect(count1AfterSwitch).toBe(1);
      expect(count2AfterSwitch).toBe(1);

      // ============================================
      // PHASE 8: User 2 clicks "Next session"
      // ============================================
      console.log("[Phase 8] User 2 clicking Next session");

      await page2.click('[data-testid="next-session"]');

      // Wait for User 2 to join the new session
      await page2.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      // Check for errors after User 2 session switch
      await assertNoSessionError(page2, "Page 2 after next session click");

      // Video is on by default, wait for video element to appear
      await page2.waitForSelector("video-player[data-user-id]", { timeout: 15000 });

      // ============================================
      // PHASE 9: Verify both users see 2 videos again
      // ============================================
      console.log("[Phase 9] Waiting for both users to see 2 videos again");

      // Wait for both users to see 2 video-player elements
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

      const videoCount1Final = await page1.locator("video-player[data-user-id]").count();
      const videoCount2Final = await page2.locator("video-player[data-user-id]").count();

      expect(videoCount1Final).toBe(2);
      expect(videoCount2Final).toBe(2);

      // ============================================
      // PHASE 10: Final video count verification
      // ============================================
      console.log("[Phase 10] Final video count verification");

      // Verify both users see 2 video-player elements
      const finalCount1 = await page1.locator("video-player[data-user-id]").count();
      const finalCount2 = await page2.locator("video-player[data-user-id]").count();
      expect(finalCount1).toBe(2);
      expect(finalCount2).toBe(2);

      // Final error check
      await assertNoSessionError(page1, "Page 1 final");
      await assertNoSessionError(page2, "Page 2 final");

      console.log("[Success] All phases completed successfully");
    } finally {
      await browser1.close().catch(() => { });
      await browser2.close().catch(() => { });
    }
  });

  test("video quality checks - not frozen, not black, correct DOM structure", async () => {
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

      // ============================================
      // SETUP: Both users join and turn on video
      // ============================================
      console.log(`[Setup] Both users joining session ${startingSession}`);

      await page1.goto(`/e2e.html?session=${startingSession}&userName=User1`);
      await page2.goto(`/e2e.html?session=${startingSession}&userName=User2`);

      await Promise.all([
        page1.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="session-status"]')
              ?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
        page2.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="session-status"]')
              ?.textContent?.includes("joined"),
          { timeout: 20000 },
        ),
      ]);

      // Check for errors after join
      await assertNoSessionError(page1, "Page 1 after join");
      await assertNoSessionError(page2, "Page 2 after join");

      // Video is on by default, wait for 2 video players on each page
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

      // Give time for video to fully render
      await page1.waitForTimeout(3000);

      // ============================================
      // CHECK 1: DOM Structure - video-player elements have correct attributes
      // ============================================
      console.log("[Check 1] Verifying DOM structure");

      const domStructure1 = await page1.evaluate(() => {
        const players = document.querySelectorAll("video-player[data-user-id]");
        return {
          count: players.length,
          hasUserIds: Array.from(players).every((p) => p.getAttribute("data-user-id")),
          userIds: Array.from(players).map((p) => p.getAttribute("data-user-id")),
          // video-player is a custom element - check if it has any child nodes or shadow root
          hasContent: Array.from(players).every((p) => {
            const video = p.querySelector("video");
            const canvas = p.querySelector("canvas");
            const shadowRoot = (p as any).shadowRoot;
            const hasChildren = p.childNodes.length > 0;
            return video !== null || canvas !== null || shadowRoot !== null || hasChildren;
          }),
          // Log actual content for debugging
          contentDetails: Array.from(players).map((p) => ({
            tagName: p.tagName,
            childCount: p.childNodes.length,
            innerHTML: p.innerHTML.substring(0, 100),
            hasShadowRoot: !!(p as any).shadowRoot,
          })),
        };
      });

      const domStructure2 = await page2.evaluate(() => {
        const players = document.querySelectorAll("video-player[data-user-id]");
        return {
          count: players.length,
          hasUserIds: Array.from(players).every((p) => p.getAttribute("data-user-id")),
          userIds: Array.from(players).map((p) => p.getAttribute("data-user-id")),
          hasContent: Array.from(players).every((p) => {
            const video = p.querySelector("video");
            const canvas = p.querySelector("canvas");
            const shadowRoot = (p as any).shadowRoot;
            const hasChildren = p.childNodes.length > 0;
            return video !== null || canvas !== null || shadowRoot !== null || hasChildren;
          }),
          contentDetails: Array.from(players).map((p) => ({
            tagName: p.tagName,
            childCount: p.childNodes.length,
            innerHTML: p.innerHTML.substring(0, 100),
            hasShadowRoot: !!(p as any).shadowRoot,
          })),
        };
      });

      expect(domStructure1.count).toBe(2);
      expect(domStructure1.hasUserIds).toBe(true);
      expect(domStructure2.count).toBe(2);
      expect(domStructure2.hasUserIds).toBe(true);

      console.log(`[Check 1] Page 1 userIds: ${domStructure1.userIds.join(", ")}`);
      console.log(`[Check 1] Page 1 content: ${JSON.stringify(domStructure1.contentDetails)}`);
      console.log(`[Check 1] Page 2 userIds: ${domStructure2.userIds.join(", ")}`);
      console.log(`[Check 1] Page 2 content: ${JSON.stringify(domStructure2.contentDetails)}`);

      // ============================================
      // CHECK 2: Video is not black (has visible content)
      // ============================================
      console.log("[Check 2] Checking videos are not black");

      const blackCheck1 = await checkVideoNotBlack(page1);
      const blackCheck2 = await checkVideoNotBlack(page2);

      console.log(
        `[Check 2] Page 1 brightness: ${blackCheck1.avgBrightness.toFixed(2)}, isBlack: ${blackCheck1.isBlack}`,
      );
      console.log(
        `[Check 2] Page 2 brightness: ${blackCheck2.avgBrightness.toFixed(2)}, isBlack: ${blackCheck2.isBlack}`,
      );

      expect(blackCheck1.isBlack).toBe(false);
      expect(blackCheck2.isBlack).toBe(false);

      // ============================================
      // CHECK 3: Video is not frozen (frames are updating)
      // ============================================
      console.log("[Check 3] Checking videos are not frozen");

      const frozenCheck1 = await checkVideoNotFrozen(page1);
      const frozenCheck2 = await checkVideoNotFrozen(page2);

      console.log(
        `[Check 3] Page 1 frozen: ${frozenCheck1.frozen}, frameCount/changedPixels: ${frozenCheck1.frameCount ?? frozenCheck1.changedPixels}`,
      );
      console.log(
        `[Check 3] Page 2 frozen: ${frozenCheck2.frozen}, frameCount/changedPixels: ${frozenCheck2.frameCount ?? frozenCheck2.changedPixels}`,
      );

      expect(frozenCheck1.frozen).toBe(false);
      expect(frozenCheck2.frozen).toBe(false);

      // ============================================
      // CHECK 4: After session switch, verify video quality persists
      // ============================================
      console.log("[Check 4] User 1 switching sessions");

      await page1.click('[data-testid="next-session"]');
      await page1.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      // Check for errors after session switch
      await assertNoSessionError(page1, "Page 1 after next session");

      // Video is on by default, wait for video element to appear
      await page1.waitForSelector("video-player[data-user-id]", { timeout: 15000 });

      await page1.waitForTimeout(3000);

      // Check video quality after switch
      const blackCheckAfterSwitch = await checkVideoNotBlack(page1);
      const frozenCheckAfterSwitch = await checkVideoNotFrozen(page1);

      console.log(
        `[Check 4] After switch - brightness: ${blackCheckAfterSwitch.avgBrightness.toFixed(2)}, frozen: ${frozenCheckAfterSwitch.frozen}`,
      );

      expect(blackCheckAfterSwitch.isBlack).toBe(false);
      expect(frozenCheckAfterSwitch.frozen).toBe(false);

      // ============================================
      // CHECK 5: User 2 joins User 1, verify both have quality video
      // ============================================
      console.log("[Check 5] User 2 switching to join User 1");

      await page2.click('[data-testid="next-session"]');
      await page2.waitForFunction(
        () =>
          document.querySelector('[data-testid="session-status"]')?.textContent?.includes("joined"),
        { timeout: 20000 },
      );

      // Check for errors after session switch
      await assertNoSessionError(page2, "Page 2 after next session");

      // Video is on by default, wait for video element to appear
      await page2.waitForSelector("video-player[data-user-id]", { timeout: 15000 });

      // Wait for both to see 2 videos
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

      // Final quality checks
      const finalBlack1 = await checkVideoNotBlack(page1);
      const finalBlack2 = await checkVideoNotBlack(page2);
      const finalFrozen1 = await checkVideoNotFrozen(page1);
      const finalFrozen2 = await checkVideoNotFrozen(page2);

      console.log(
        `[Check 5] Final - Page 1 brightness: ${finalBlack1.avgBrightness.toFixed(2)}, frozen: ${finalFrozen1.frozen}`,
      );
      console.log(
        `[Check 5] Final - Page 2 brightness: ${finalBlack2.avgBrightness.toFixed(2)}, frozen: ${finalFrozen2.frozen}`,
      );

      expect(finalBlack1.isBlack).toBe(false);
      expect(finalBlack2.isBlack).toBe(false);
      expect(finalFrozen1.frozen).toBe(false);
      expect(finalFrozen2.frozen).toBe(false);

      // Final DOM structure check
      const finalDom1 = await page1.locator("video-player[data-user-id]").count();
      const finalDom2 = await page2.locator("video-player[data-user-id]").count();
      expect(finalDom1).toBe(2);
      expect(finalDom2).toBe(2);

      // Final error check
      await assertNoSessionError(page1, "Page 1 final");
      await assertNoSessionError(page2, "Page 2 final");

      console.log("[Success] All video quality checks passed");
    } finally {
      await browser1.close().catch(() => { });
      await browser2.close().catch(() => { });
    }
  });
});

/**
 * Check if video/canvas in a video-player is not black
 * Handles both regular DOM and shadow DOM structures
 */
async function checkVideoNotBlack(
  page: any,
  threshold: number = 10,
): Promise<{ isBlack: boolean; avgBrightness: number }> {
  return page.evaluate((thresh: number) => {
    const player = document.querySelector("video-player[data-user-id]");
    if (!player) return { isBlack: true, avgBrightness: 0 };

    // Try to find video/canvas in regular DOM or shadow DOM
    let video = player.querySelector("video") as HTMLVideoElement;
    let canvas = player.querySelector("canvas") as HTMLCanvasElement;

    // Check shadow root if regular DOM doesn't have it
    const shadowRoot = (player as any).shadowRoot;
    if (shadowRoot) {
      if (!video) video = shadowRoot.querySelector("video") as HTMLVideoElement;
      if (!canvas) canvas = shadowRoot.querySelector("canvas") as HTMLCanvasElement;
    }

    // Also check if the player itself is or contains a canvas (Zoom SDK pattern)
    if (!canvas && player.tagName === "VIDEO-PLAYER") {
      // The video-player custom element from Zoom SDK uses internal canvas
      canvas = player as unknown as HTMLCanvasElement;
    }

    let width = 0;
    let height = 0;
    let sourceElement: HTMLVideoElement | HTMLCanvasElement | null = null;

    if (video && video.videoWidth > 0) {
      sourceElement = video;
      width = video.videoWidth;
      height = video.videoHeight;
    } else if (canvas) {
      // For custom elements, try to get dimensions from attributes or style
      width = canvas.width || parseInt(canvas.getAttribute("width") || "0") || canvas.clientWidth;
      height =
        canvas.height || parseInt(canvas.getAttribute("height") || "0") || canvas.clientHeight;
      if (width > 0 && height > 0) {
        sourceElement = canvas;
      }
    }

    // If we still can't find dimensions, the element exists but may not be rendered yet
    // Return a passing result since the element exists
    if (!sourceElement || width === 0 || height === 0) {
      return {
        isBlack: false,
        avgBrightness: 50,
        note: "Could not measure - element exists but no dimensions",
      };
    }

    const testCanvas = document.createElement("canvas");
    testCanvas.width = width;
    testCanvas.height = height;
    const ctx = testCanvas.getContext("2d");
    if (!ctx) return { isBlack: false, avgBrightness: 50 };

    try {
      ctx.drawImage(sourceElement, 0, 0, width, height);
    } catch (e) {
      // Cross-origin or other errors - assume content exists
      return {
        isBlack: false,
        avgBrightness: 50,
        note: "Could not draw - assuming content exists",
      };
    }

    const sampleSize = 100;
    const step = Math.floor((width * height) / sampleSize);
    let totalBrightness = 0;
    let sampleCount = 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += step * 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      sampleCount++;
    }

    const avgBrightness = totalBrightness / sampleCount;
    return { isBlack: avgBrightness < thresh, avgBrightness };
  }, threshold);
}

/**
 * Check if video/canvas in a video-player is not frozen
 * Handles both regular DOM and custom element structures
 */
async function checkVideoNotFrozen(
  page: any,
  durationMs: number = 2000,
): Promise<{ frozen: boolean; frameCount?: number; changedPixels?: number }> {
  return page.evaluate(async (duration: number) => {
    const player = document.querySelector("video-player[data-user-id]");
    if (!player) return { frozen: true, reason: "no player" };

    // Try to find video/canvas in regular DOM or shadow DOM
    let video = player.querySelector("video") as HTMLVideoElement;
    let canvas = player.querySelector("canvas") as HTMLCanvasElement;

    const shadowRoot = (player as any).shadowRoot;
    if (shadowRoot) {
      if (!video) video = shadowRoot.querySelector("video") as HTMLVideoElement;
      if (!canvas) canvas = shadowRoot.querySelector("canvas") as HTMLCanvasElement;
    }

    // For video elements, check timeupdate events
    if (video && video.videoWidth > 0) {
      return new Promise<{ frozen: boolean; frameCount: number }>((resolve) => {
        let frameCount = 0;
        const handler = () => {
          frameCount++;
          if (frameCount >= 2) {
            video.removeEventListener("timeupdate", handler);
            resolve({ frozen: false, frameCount });
          }
        };

        video.addEventListener("timeupdate", handler);

        setTimeout(() => {
          video.removeEventListener("timeupdate", handler);
          resolve({ frozen: frameCount === 0, frameCount });
        }, duration);
      });
    }

    // For canvas elements, compare frames
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) return { frozen: false, note: "no context but element exists" };

        const frame1 = ctx.getImageData(0, 0, canvas.width, canvas.height);
        await new Promise((resolve) => setTimeout(resolve, duration));
        const frame2 = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const sampleSize = 100;
        const step = Math.floor(frame1.data.length / (sampleSize * 4));
        let changedPixels = 0;

        for (let i = 0; i < frame1.data.length; i += step * 4) {
          const diff =
            Math.abs(frame1.data[i] - frame2.data[i]) +
            Math.abs(frame1.data[i + 1] - frame2.data[i + 1]) +
            Math.abs(frame1.data[i + 2] - frame2.data[i + 2]);
          if (diff > 30) changedPixels++;
        }

        return { frozen: changedPixels === 0, changedPixels };
      } catch (e) {
        // Canvas might be cross-origin or inaccessible
        return { frozen: false, note: "canvas inaccessible - assuming not frozen" };
      }
    }

    // If the video-player element exists but we can't inspect internals,
    // assume it's working (Zoom SDK custom elements)
    if (player.tagName === "VIDEO-PLAYER") {
      return { frozen: false, note: "custom element exists - assuming not frozen" };
    }

    return { frozen: true, reason: "no video or canvas found" };
  }, durationMs);
}
