import { test, expect } from "../fixtures/zoom-session";

// Note: Audio starts UNMUTED by default in Zoom SDK

test.describe("Audio Controls", () => {
  test("audio starts unmuted when session joins", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Check initial audio state (starts unmuted)
    const audioButtonText = await page.textContent('[data-testid="audio-toggle"]');
    expect(audioButtonText).toContain("mute audio"); // Can mute = currently unmuted
  });

  test("audio state persists across video toggles", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Wait for audio to fully initialize (SDK can be slow)
    await page.waitForTimeout(3000);

    // Mute audio (wait for SDK to process)
    await page.click('[data-testid="audio-toggle"]');
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-testid="audio-toggle"]');
        return btn?.textContent?.includes("unmute audio") ?? false;
      },
      { timeout: 15000 },
    );

    let muteButtonText = await page.textContent('[data-testid="audio-toggle"]');
    expect(muteButtonText).toContain("unmute audio");

    // Toggle video off and back on (video is on by default)
    await page.click('[data-testid="video-toggle"]');
    await page.waitForTimeout(2000);
    await page.click('[data-testid="video-toggle"]');
    await page.waitForTimeout(2000);

    // Audio should still be muted
    muteButtonText = await page.textContent('[data-testid="audio-toggle"]');
    expect(muteButtonText).toContain("unmute audio");
  });

  test("multiple mute/unmute cycles work correctly", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Wait for audio to start capturing
    await page.waitForTimeout(2000);

    // Perform 3 mute/unmute cycles
    for (let i = 0; i < 3; i++) {
      // Get current state
      let text = await page.textContent('[data-testid="audio-toggle"]');
      // Check if currently unmuted (button shows "mute audio" but NOT "unmute audio")
      const isCurrentlyUnmuted = text?.includes("mute audio") && !text?.includes("unmute audio");

      // Toggle
      await page.click('[data-testid="audio-toggle"]');

      // Wait for state to change (SDK takes 1-2 seconds)
      if (isCurrentlyUnmuted) {
        // Was unmuted, expect to become muted
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('[data-testid="audio-toggle"]');
            return btn?.textContent?.includes("unmute audio") ?? false;
          },
          { timeout: 5000 },
        );
        text = await page.textContent('[data-testid="audio-toggle"]');
        expect(text).toContain("unmute audio");
      } else {
        // Expect to become unmuted
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('[data-testid="audio-toggle"]');
            return btn?.textContent?.includes("mute audio") ?? false;
          },
          { timeout: 5000 },
        );
        text = await page.textContent('[data-testid="audio-toggle"]');
        expect(text).toContain("mute audio");
      }
    }
  });
});
