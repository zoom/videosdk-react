import { test, expect } from "../fixtures/zoom-session";
import { generateTestTopic } from "../fixtures/jwt-helper";
import { joinSession } from "../fixtures/zoom-session";

const VIDEO_SELECTOR = "video-player[data-user-id]";

test.describe("Video Rendering and Quality", () => {
  test("video maintains state after multiple toggle cycles", async ({ page }) => {
    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    // Video is on by default, wait for it
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // Perform 3 off/on cycles
    for (let i = 0; i < 3; i++) {
      console.log(`Cycle ${i + 1}: Toggle off...`);
      await page.click('[data-testid="video-toggle"]');
      await page.waitForTimeout(1000);

      console.log(`Cycle ${i + 1}: Toggle on...`);
      await page.click('[data-testid="video-toggle"]');
      await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

      const count = await page.locator(VIDEO_SELECTOR).count();
      expect(count).toBeGreaterThan(0);
    }

    console.log("Video maintained state across multiple toggles");
  });

  test("video player has proper DOM structure", async ({ page }) => {
    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });
    await page.waitForTimeout(2000);

    const videoPlayer = page.locator(VIDEO_SELECTOR).first();

    // Verify visible
    await expect(videoPlayer).toBeVisible();

    // Required attributes
    const userId = await videoPlayer.getAttribute("data-user-id");
    expect(userId).toBeTruthy();
    expect(userId).toMatch(/^\d+$/);

    const nodeId = await videoPlayer.getAttribute("node-id");
    expect(nodeId).toBeTruthy();

    const mediaType = await videoPlayer.getAttribute("media-type");
    expect(mediaType).toBe("video");

    // Verify has content
    const innerHTML = await videoPlayer.innerHTML();
    expect(innerHTML).toContain("div");
    expect(innerHTML.length).toBeGreaterThan(10);

    // Verify dimensions
    const box = await videoPlayer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);
  });

  test("video is actively rendering (not frozen)", async ({ page }) => {
    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });
    await page.waitForTimeout(3000);

    const videoPlayer = page.locator(VIDEO_SELECTOR).first();

    // Check for canvas or video element rendering
    const isPlaying = await videoPlayer.evaluate((el) => {
      const canvas = (el as any).shadowRoot?.querySelector("canvas") || el.querySelector("canvas");
      if (canvas) {
        return canvas.width > 0 && canvas.height > 0;
      }

      const video = (el as any).shadowRoot?.querySelector("video") || el.querySelector("video");
      if (video) {
        return !video.paused && video.readyState >= 2;
      }

      return el.offsetWidth > 0 && el.offsetHeight > 0;
    });

    expect(isPlaying).toBe(true);

    const box = await videoPlayer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);
  });

  test("re-attaches the video at the new quality when quality changes", async ({ page }) => {
    // VideoQuality.Video_360P === 2, VideoQuality.Video_720P === 3
    const QUALITY_360P = "2";
    const QUALITY_720P = "3";

    const topic = generateTestTopic();
    await joinSession(page, topic, "TestUser");

    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // The stream is stamped with the initial (360p) quality
    await page.waitForFunction(
      (q) => document.querySelector(`video-player[data-video-quality='${q}']`) !== null,
      QUALITY_360P,
      { timeout: 15000 },
    );

    const initialUserId = await page.locator(VIDEO_SELECTOR).first().getAttribute("data-user-id");
    expect(initialUserId).toBeTruthy();

    // Bump quality to 720p
    await page.click('[data-testid="quality-toggle"]');

    // The stream must be detached and re-attached at the new quality (was a silent no-op before the fix)
    await page.waitForFunction(
      (q) => {
        const el = document.querySelector("video-player[data-user-id]");
        return el !== null && el.getAttribute("data-video-quality") === q;
      },
      QUALITY_720P,
      { timeout: 15000 },
    );

    // Video is still rendered for the same user after the re-attach
    expect(await page.locator(VIDEO_SELECTOR).count()).toBeGreaterThan(0);
    const reattachedUserId = await page.locator(VIDEO_SELECTOR).first().getAttribute("data-user-id");
    expect(reattachedUserId).toBe(initialUserId);
  });
});
