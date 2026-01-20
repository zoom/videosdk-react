import { test, expect } from "../fixtures/zoom-session";

// Note: Zoom SDK creates custom <video-player> web components, not standard <video> elements
const VIDEO_SELECTOR = "video-player[data-user-id]";

test.describe("Video Rendering", () => {
  test("renders video when participant joins", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Turn on video (it starts off by default)
    await page.click('[data-testid="video-toggle"]');

    // Wait for video-player element to appear (Zoom SDK uses custom web components)
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // Verify video-player element exists
    const videoElements = await page.locator(VIDEO_SELECTOR).count();
    expect(videoElements).toBeGreaterThan(0);
  });

  test("video player element is rendered", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Turn on video
    await page.click('[data-testid="video-toggle"]');
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // Verify video-player exists and has proper structure
    const videoPlayer = page.locator(VIDEO_SELECTOR).first();
    await expect(videoPlayer).toBeVisible();

    // Check it has data-user-id
    const userId = await videoPlayer.getAttribute("data-user-id");
    expect(userId).toBeTruthy();
  });

  test("video player contains media content", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Turn on video
    await page.click('[data-testid="video-toggle"]');
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // Verify video-player has inner content (div elements from Zoom SDK)
    const videoPlayer = page.locator(VIDEO_SELECTOR).first();
    const innerHTML = await videoPlayer.innerHTML();

    // Should contain div structure from Zoom SDK
    expect(innerHTML).toContain("div");
    expect(innerHTML.length).toBeGreaterThan(10);
  });

  test("toggles video on and off", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Initially video is off (shows "unmute video")
    let videoToggleText = await page.textContent('[data-testid="video-toggle"]');
    expect(videoToggleText).toContain("unmute video");

    // Turn on video (SDK takes 1-2 seconds to process)
    await page.click('[data-testid="video-toggle"]');
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    let videoCount = await page.locator(VIDEO_SELECTOR).count();
    expect(videoCount).toBeGreaterThan(0);

    // Wait for button state to update
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="video-toggle"]');
        return btn?.textContent?.includes("mute video") ?? false;
      },
      { timeout: 5000 },
    );

    videoToggleText = await page.textContent('[data-testid="video-toggle"]');
    expect(videoToggleText).toContain("mute video");

    // Turn off video
    await page.click('[data-testid="video-toggle"]');

    // Wait for state to update (SDK takes 1-2 seconds)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="video-toggle"]');
        return btn?.textContent?.includes("unmute video") ?? false;
      },
      { timeout: 5000 },
    );

    videoToggleText = await page.textContent('[data-testid="video-toggle"]');
    expect(videoToggleText).toContain("unmute video");
  });

  test("video has data-user-id attribute", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Turn on video
    await page.click('[data-testid="video-toggle"]');
    await page.waitForSelector(VIDEO_SELECTOR, { timeout: 15000 });

    // Check that video-player has user ID attribute
    const userId = await page.getAttribute(`${VIDEO_SELECTOR}:first-of-type`, "data-user-id");
    expect(userId).toBeTruthy();
    expect(userId).toMatch(/^\d+$/); // Should be a number
  });
});
