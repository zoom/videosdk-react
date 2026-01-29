import { test, expect } from "../fixtures/zoom-session";
import { generateTestTopic } from "../fixtures/jwt-helper";

test.describe("Session Lifecycle", () => {
  test("successfully joins a session", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);

    // Wait for session to connect
    await zoomSession.waitForConnection(page);

    // Verify we're in the session
    const sessionStatus = await page.textContent('[data-testid="session-status"]');
    expect(sessionStatus).toContain("joined");

    // Verify controls are visible
    await expect(page.locator('[data-testid="controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="audio-toggle"]')).toBeVisible();
  });

  test.skip("shows loading state while connecting", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);

    // Check for loading state
    const statusText = await page.textContent('[data-testid="session-status"]');
    expect(statusText).toContain("loading");
  });

  test("displays error when connection fails", async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for error scenarios

    const topic = generateTestTopic();

    // Use an invalid JWT token (malformed)
    const invalidToken = "invalid.jwt.token";

    // Navigate with invalid JWT via URL parameter
    await page.goto(
      `/e2e.html?session=${encodeURIComponent(topic)}&userName=TestUser&jwt=${encodeURIComponent(invalidToken)}`,
    );

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Wait for error state (indicated by "session ended" being visible while not loading)
    await page.waitForFunction(
      () => {
        const sessionEnded = document.querySelector('[data-testid="session-ended"]');
        const sessionStatus = document.querySelector('[data-testid="session-status"]');
        const statusText = sessionStatus?.textContent || "";

        // Session ended should be visible and not showing "loading..."
        return (
          sessionEnded &&
          sessionEnded.textContent?.includes("session ended") &&
          !statusText.includes("loading")
        );
      },
      { timeout: 30000 },
    );

    // Verify error indicator is in the status (error object stringified or error message)
    const statusText = await page.textContent('[data-testid="session-status"]');
    // Either contains "Object" (from JSON.stringify of error object) or doesn't contain "joined"
    expect(statusText).not.toContain("joined");

    // Verify controls are not visible when there's an error
    const controls = page.locator('[data-testid="controls"]');
    await expect(controls).not.toBeVisible();

    // Verify "session ended" message is shown (not "loading...")
    const sessionEnded = page.locator('[data-testid="session-ended"]');
    await expect(sessionEnded).toBeVisible();
    await expect(sessionEnded).toHaveText("session ended");
  });

  test("maintains session across page interactions", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Verify we're in session
    expect(await zoomSession.isInSession(page)).toBe(true);

    // Interact with the page (toggle video)
    await page.click('[data-testid="video-toggle"]');
    await page.waitForTimeout(1000);

    // Should still be in session
    expect(await zoomSession.isInSession(page)).toBe(true);
  });

  test("video container is present when in session", async ({ page, zoomSession }) => {
    await zoomSession.goto(page);
    await zoomSession.waitForConnection(page);

    // Video container should be visible
    const videoContainer = page.locator('[data-testid="video-container"]');
    await expect(videoContainer).toBeVisible();
  });
});
