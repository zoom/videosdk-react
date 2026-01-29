import { PNG } from "pngjs";

/**
 * Analyze screenshot to determine if it's a black screen
 * @param screenshot - Screenshot buffer from Playwright
 * @param blackThreshold - Pixel value threshold to consider as "black" (0-255)
 * @param blackPercentageThreshold - Percentage of pixels that must be black to consider screen black (0-100)
 * @returns true if the screenshot is mostly black
 */
export async function isBlackScreen(
  screenshot: Buffer,
  blackThreshold: number = 30,
  blackPercentageThreshold: number = 95,
): Promise<boolean> {
  const png = PNG.sync.read(screenshot);
  const { width, height, data } = png;
  const totalPixels = width * height;
  let blackPixels = 0;

  // Iterate through pixels (RGBA format, 4 bytes per pixel)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // a = data[i + 3]; // alpha channel, not needed

    // Check if pixel is black (all RGB values below threshold)
    if (r < blackThreshold && g < blackThreshold && b < blackThreshold) {
      blackPixels++;
    }
  }

  const blackPercentage = (blackPixels / totalPixels) * 100;
  return blackPercentage >= blackPercentageThreshold;
}

/**
 * Analyze screenshot to determine if it's a white screen
 * @param screenshot - Screenshot buffer from Playwright
 * @param whiteThreshold - Pixel value threshold to consider as "white" (0-255)
 * @param whitePercentageThreshold - Percentage of pixels that must be white to consider screen white (0-100)
 * @returns true if the screenshot is mostly white
 */
export async function isWhiteScreen(
  screenshot: Buffer,
  whiteThreshold: number = 240,
  whitePercentageThreshold: number = 95,
): Promise<boolean> {
  const png = PNG.sync.read(screenshot);
  const { width, height, data } = png;
  const totalPixels = width * height;
  let whitePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is white (all RGB values above threshold)
    if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
      whitePixels++;
    }
  }

  const whitePercentage = (whitePixels / totalPixels) * 100;
  return whitePercentage >= whitePercentageThreshold;
}

/**
 * Compare two screenshots to determine if video is frozen
 * @param screenshot1 - First screenshot buffer
 * @param screenshot2 - Second screenshot buffer
 * @param similarityThreshold - Percentage of pixels that must match to consider frozen (0-100)
 * @returns true if screenshots are too similar (indicating frozen video)
 */
export async function isFrozenVideo(
  screenshot1: Buffer,
  screenshot2: Buffer,
  similarityThreshold: number = 98,
): Promise<boolean> {
  const png1 = PNG.sync.read(screenshot1);
  const png2 = PNG.sync.read(screenshot2);

  // Ensure screenshots are same dimensions
  if (png1.width !== png2.width || png1.height !== png2.height) {
    throw new Error("Screenshots must have the same dimensions for comparison");
  }

  const totalPixels = png1.width * png1.height;
  let matchingPixels = 0;
  const colorThreshold = 10; // Allow small color variations

  // Compare each pixel
  for (let i = 0; i < png1.data.length; i += 4) {
    const r1 = png1.data[i];
    const g1 = png1.data[i + 1];
    const b1 = png1.data[i + 2];

    const r2 = png2.data[i];
    const g2 = png2.data[i + 1];
    const b2 = png2.data[i + 2];

    // Check if pixels are similar within threshold
    if (
      Math.abs(r1 - r2) <= colorThreshold &&
      Math.abs(g1 - g2) <= colorThreshold &&
      Math.abs(b1 - b2) <= colorThreshold
    ) {
      matchingPixels++;
    }
  }

  const similarityPercentage = (matchingPixels / totalPixels) * 100;
  return similarityPercentage >= similarityThreshold;
}

/**
 * Calculate average brightness of a screenshot
 * @param screenshot - Screenshot buffer
 * @returns Average brightness value (0-255)
 */
export async function getAverageBrightness(screenshot: Buffer): Promise<number> {
  const png = PNG.sync.read(screenshot);
  const { data } = png;
  let totalBrightness = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Calculate brightness using standard formula
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
  }

  return totalBrightness / pixelCount;
}

/**
 * Get color distribution statistics from screenshot
 * @param screenshot - Screenshot buffer
 * @returns Object with color statistics
 */
export async function getColorStats(screenshot: Buffer): Promise<{
  avgRed: number;
  avgGreen: number;
  avgBlue: number;
  avgBrightness: number;
  totalPixels: number;
}> {
  const png = PNG.sync.read(screenshot);
  const { width, height, data } = png;
  const totalPixels = width * height;

  let totalR = 0,
    totalG = 0,
    totalB = 0;

  for (let i = 0; i < data.length; i += 4) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  }

  const avgRed = totalR / totalPixels;
  const avgGreen = totalG / totalPixels;
  const avgBlue = totalB / totalPixels;
  const avgBrightness = 0.299 * avgRed + 0.587 * avgGreen + 0.114 * avgBlue;

  return {
    avgRed,
    avgGreen,
    avgBlue,
    avgBrightness,
    totalPixels,
  };
}
