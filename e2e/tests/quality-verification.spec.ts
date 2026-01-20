import { test, expect } from "@playwright/test";
import { generateTestTopic } from "../fixtures/jwt-helper";
import { joinSession } from "../fixtures/zoom-session";

// Note: Zoom SDK uses custom web components, can't analyze video/audio with Canvas/Web Audio APIs
const VIDEO_SELECTOR = "video-player[data-user-id]";

test.describe("Video and Audio Quality Verification", () => {
  test("video player renders and displays content", async ({ page }) => {
    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    // Video is on by default, wait for it
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    const videoPlayer = page.locator(VIDEO_SELECTOR).first();

    // Verify video-player is visible
    await expect(videoPlayer).toBeVisible();

    // Verify it has content
    const innerHTML = await videoPlayer.innerHTML();
    expect(innerHTML.length).toBeGreaterThan(10);

    console.log("✓ Video player rendered successfully");
  });

  test("audio controls function correctly", async ({ page }) => {
    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    // Wait for audio to fully initialize (SDK can be slow)
    await page.waitForTimeout(3000);

    // Audio starts unmuted
    let audioText = await page.textContent('[data-testid="audio-toggle"]');
    expect(audioText).toContain("mute audio");

    // Mute (SDK can take several seconds to process)
    await page.click('[data-testid="audio-toggle"]');

    // Wait for state to update with longer timeout to avoid flakiness
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="audio-toggle"]');
        return btn?.textContent?.includes("unmute audio") ?? false;
      },
      { timeout: 15000 },
    );

    audioText = await page.textContent('[data-testid="audio-toggle"]');
    expect(audioText).toContain("unmute audio");

    console.log("✓ Audio controls work correctly");
  });

  test("video in multi-user scenario", async ({ browser }) => {
    const topic = generateTestTopic();

    const context1 = await browser.newContext({ permissions: ["camera", "microphone"] });
    const context2 = await browser.newContext({ permissions: ["camera", "microphone"] });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both users join the same session with unique userNames
      await joinSession(page1, topic, "User1");
      await joinSession(page2, topic, "User2");

      // Video is on by default, wait for it
      await page1.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      // Wait for video to propagate to User 2
      await page2.waitForTimeout(3000);

      // User 2 should see at least 1 video (User 1's video)
      const videoCountPage2 = await page2.locator(VIDEO_SELECTOR).count();
      expect(videoCountPage2).toBeGreaterThanOrEqual(1);

      console.log("✓ Multi-user video works correctly");
    } finally {
      await context1.close().catch(() => { });
      await context2.close().catch(() => { });
    }
  });

  test("video maintains state after multiple toggles", async ({ page }) => {
    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    // Video is on by default, wait for it first
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // Perform 3 off/on cycles
    for (let i = 0; i < 3; i++) {
      console.log(`Cycle ${i + 1}: Turning video OFF...`);

      // Turn off video
      await page.click('[data-testid="video-toggle"]');
      await page.waitForTimeout(1000);

      console.log(`Cycle ${i + 1}: Turning video ON...`);

      // Turn on video
      await page.click('[data-testid="video-toggle"]');
      await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      // Verify video player exists
      const count = await page.locator(VIDEO_SELECTOR).count();
      expect(count).toBeGreaterThan(0);

      console.log(`Cycle ${i + 1}: Video rendered`);
    }

    console.log("✓ Video maintained state across multiple toggles!");
  });

  test("video player has proper structure", async ({ page }) => {
    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    // Video is on by default, wait for it
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // Give SDK time to fully render the video player
    await page.waitForTimeout(2000);

    // Check video player properties
    const videoPlayer = page.locator(VIDEO_SELECTOR).first();

    // Should have data-user-id
    const userId = await videoPlayer.getAttribute("data-user-id");
    expect(userId).toBeTruthy();
    expect(userId).toMatch(/^\d+$/);

    // Should have node-id
    const nodeId = await videoPlayer.getAttribute("node-id");
    expect(nodeId).toBeTruthy();

    // Should have media-type
    const mediaType = await videoPlayer.getAttribute("media-type");
    expect(mediaType).toBe("video");

    console.log("✓ Video player has proper structure");
  });
});
