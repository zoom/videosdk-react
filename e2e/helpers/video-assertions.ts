import { Page, expect } from "@playwright/test";

/**
 * Assert that a video element is playing (not paused or frozen)
 */
export async function assertVideoIsPlaying(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 10000 });

  const isPlaying = await page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    if (!video) return false;

    // Check video is not paused or ended
    if (video.paused || video.ended) return false;

    // Check video has loaded enough to play
    if (video.readyState < 2) return false; // HAVE_CURRENT_DATA or higher

    return true;
  }, selector);

  expect(isPlaying).toBe(true);
}

/**
 * Assert that video is not frozen (frames are updating)
 */
export async function assertVideoIsNotFrozen(
  page: Page,
  selector: string,
  durationMs: number = 2000,
): Promise<void> {
  const result = await page.evaluate(
    async ([sel, duration]: [string, number]) => {
      const video = document.querySelector(sel) as HTMLVideoElement;
      if (!video) return { frozen: true, reason: "Video element not found" };

      return new Promise<{ frozen: boolean; frameCount?: number }>((resolve) => {
        let frameCount = 0;
        const handler = () => {
          frameCount++;
          if (frameCount >= 2) {
            video.removeEventListener("timeupdate", handler);
            resolve({ frozen: false, frameCount });
          }
        };

        video.addEventListener("timeupdate", handler);

        // Timeout if no frames
        setTimeout(() => {
          video.removeEventListener("timeupdate", handler);
          resolve({ frozen: frameCount === 0, frameCount });
        }, duration);
      });
    },
    [selector, durationMs] as [string, number],
  );

  expect(result.frozen).toBe(false);
}

/**
 * Assert that video is not displaying a black screen
 */
export async function assertVideoIsNotBlack(
  page: Page,
  selector: string,
  threshold: number = 10,
): Promise<void> {
  const analysis = await page.evaluate(
    ([sel, thresh]: [string, number]) => {
      const video = document.querySelector(sel) as HTMLVideoElement;
      if (!video) return { isBlack: true, avgBrightness: 0 };

      // Create canvas to sample video frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx || canvas.width === 0 || canvas.height === 0) {
        return { isBlack: true, avgBrightness: 0, reason: "Invalid dimensions" };
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Sample pixels (check multiple points for performance)
      const sampleSize = 100;
      const step = Math.floor((canvas.width * canvas.height) / sampleSize);

      let totalBrightness = 0;
      let sampleCount = 0;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += step * 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Calculate brightness (perceived luminance)
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        totalBrightness += brightness;
        sampleCount++;
      }

      const avgBrightness = totalBrightness / sampleCount;

      return {
        isBlack: avgBrightness < thresh,
        avgBrightness,
        dimensions: { width: canvas.width, height: canvas.height },
      };
    },
    [selector, threshold] as [string, number],
  );

  expect(analysis.isBlack).toBe(false);
  expect(analysis.avgBrightness).toBeGreaterThan(threshold);
}

/**
 * Assert that video has motion (frames are changing)
 */
export async function assertVideoHasMotion(
  page: Page,
  selector: string,
  durationMs: number = 3000,
  motionThreshold: number = 3,
): Promise<void> {
  const result = await page.evaluate(
    async ([sel, duration, threshold]: [string, number, number]) => {
      const video = document.querySelector(sel) as HTMLVideoElement;
      if (!video) return { hasMotion: false, changePercent: 0 };

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx || canvas.width === 0 || canvas.height === 0) {
        return { hasMotion: false, changePercent: 0, reason: "Invalid dimensions" };
      }

      // Capture first frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame1 = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Wait
      await new Promise((resolve) => setTimeout(resolve, duration));

      // Capture second frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame2 = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Compare frames (sample for performance)
      const sampleSize = 1000;
      const step = Math.floor(frame1.data.length / (sampleSize * 4));
      let changedPixels = 0;
      let totalSampled = 0;

      for (let i = 0; i < frame1.data.length; i += step * 4) {
        const r1 = frame1.data[i];
        const g1 = frame1.data[i + 1];
        const b1 = frame1.data[i + 2];

        const r2 = frame2.data[i];
        const g2 = frame2.data[i + 1];
        const b2 = frame2.data[i + 2];

        // Calculate difference
        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

        // Threshold for considering a pixel "changed"
        if (diff > 30) {
          changedPixels++;
        }
        totalSampled++;
      }

      const changePercent = (changedPixels / totalSampled) * 100;

      return {
        hasMotion: changePercent > threshold,
        changePercent,
      };
    },
    [selector, durationMs, motionThreshold] as [string, number, number],
  );

  expect(result.hasMotion).toBe(true);
  expect(result.changePercent).toBeGreaterThan(motionThreshold);
}

/**
 * Wait for video element to render and be ready
 * Note: Zoom SDK may use canvas elements with fake devices
 */
export async function waitForVideoToRender(
  page: Page,
  selector: string,
  timeout: number = 10000,
): Promise<void> {
  // Wait for element to exist (could be video or canvas)
  await page.waitForSelector(selector, { timeout });

  // For video elements, wait for readyState
  // For canvas elements, just check they exist and have dimensions
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      // If it's a video element, check readyState
      if (element instanceof HTMLVideoElement) {
        return element.readyState >= 2; // HAVE_CURRENT_DATA
      }

      // If it's a canvas element, check it has dimensions
      if (element instanceof HTMLCanvasElement) {
        return element.width > 0 && element.height > 0;
      }

      // For other elements, just check they exist
      return true;
    },
    selector,
    { timeout },
  );
}

/**
 * Get video element properties for debugging
 */
export async function getVideoProperties(
  page: Page,
  selector: string,
): Promise<{
  exists: boolean;
  paused: boolean;
  ended: boolean;
  readyState: number;
  width: number;
  height: number;
  currentTime: number;
}> {
  return page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    if (!video) {
      return {
        exists: false,
        paused: false,
        ended: false,
        readyState: 0,
        width: 0,
        height: 0,
        currentTime: 0,
      };
    }

    return {
      exists: true,
      paused: video.paused,
      ended: video.ended,
      readyState: video.readyState,
      width: video.videoWidth,
      height: video.videoHeight,
      currentTime: video.currentTime,
    };
  }, selector);
}
