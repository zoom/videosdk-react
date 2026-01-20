import { test as base, Page } from "@playwright/test";
import { generateTestToken, generateTestTopic } from "./jwt-helper";

type ZoomSessionFixture = {
  /**
   * Zoom session fixture that provides utilities for E2E testing
   */
  zoomSession: {
    /** Unique topic for this test session */
    topic: string;
    /** JWT token for this session */
    token: string;
    /** Navigate to playground and wait for it to load */
    goto: (page: Page) => Promise<void>;
    /** Wait for session to be connected */
    waitForConnection: (page: Page, timeout?: number) => Promise<void>;
    /** Check if currently in session */
    isInSession: (page: Page) => Promise<boolean>;
  };
};

/**
 * Extended Playwright test with Zoom session fixture
 *
 * @example
 * ```typescript
 * import { test, expect } from '../fixtures/zoom-session';
 *
 * test('can join session', async ({ page, zoomSession }) => {
 *   await zoomSession.goto(page);
 *   await zoomSession.waitForConnection(page);
 *   expect(await zoomSession.isInSession(page)).toBe(true);
 * });
 * ```
 */
export const test = base.extend<ZoomSessionFixture>({
  zoomSession: async ({ page: _page }, use) => {
    const topic = generateTestTopic();
    const token = generateTestToken(topic, 1); // Role 1 = host

    const goto = async (page: Page, userName: string = "TestUser") => {
      // Pass unique session and userName via URL parameters to avoid session conflicts
      // Use /e2e.html for e2e tests (separate from main playground)
      await page.goto(
        `/e2e.html?session=${encodeURIComponent(topic)}&userName=${encodeURIComponent(userName)}`,
      );
      // Wait for page to be fully loaded
      await page.waitForLoadState("networkidle");
    };

    const waitForConnection = async (page: Page, timeout: number = 15000) => {
      // Wait for "joined" text to appear in the h1
      await page.waitForFunction(
        () => {
          const h1 = document.querySelector("h1");
          return h1?.textContent?.includes("joined") ?? false;
        },
        { timeout },
      );
    };

    const isInSession = async (page: Page): Promise<boolean> => {
      return page.evaluate(() => {
        const h1 = document.querySelector("h1");
        return h1?.textContent?.includes("joined") ?? false;
      });
    };

    await use({
      topic,
      token,
      goto,
      waitForConnection,
      isInSession,
    });

    // Cleanup: if still in session, try to leave gracefully
    // Note: The current playground doesn't have a leave button,
    // but we close the page anyway which ends the session
  },
});

export { expect } from "@playwright/test";

/**
 * Helper to navigate a page to join a specific session
 * Uses /e2e.html for e2e tests (separate from main playground)
 */
export async function joinSession(page: Page, topic: string, userName: string) {
  await page.goto(
    `/e2e.html?session=${encodeURIComponent(topic)}&userName=${encodeURIComponent(userName)}`,
  );
  await page.waitForLoadState("networkidle");

  // Wait for session to connect
  await page.waitForFunction(
    () => {
      const h1 = document.querySelector("h1");
      return h1?.textContent?.includes("joined") ?? false;
    },
    { timeout: 15000 },
  );
}
