import { Page, expect } from "@playwright/test";

/**
 * Assert that audio is audible (not silent)
 */
export async function assertAudioIsAudible(
  page: Page,
  selector: string = "video",
  durationMs: number = 2000,
  volumeThreshold: number = 0.01,
): Promise<void> {
  const result = await page.evaluate(
    async ([sel, duration, threshold]: [string, number, number]): Promise<{
      isAudible: boolean;
      avgVolume: number;
      samples?: number;
      reason?: string;
    }> => {
      try {
        const videoElement = document.querySelector(sel) as HTMLVideoElement;

        if (!videoElement || !videoElement.srcObject) {
          return { isAudible: false, avgVolume: 0, reason: "No media stream" };
        }

        // Get audio context and create analyzer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        // Create media stream source
        const source = audioContext.createMediaStreamSource(videoElement.srcObject as MediaStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        return new Promise((resolve) => {
          let samples = 0;
          let totalVolume = 0;

          const checkAudio = () => {
            analyser.getByteTimeDomainData(dataArray);

            // Calculate RMS (root mean square) volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
              sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / bufferLength);

            totalVolume += rms;
            samples++;
          };

          // Sample audio multiple times
          const interval = setInterval(checkAudio, 100);

          setTimeout(() => {
            clearInterval(interval);
            source.disconnect();
            void audioContext.close().catch(() => { });

            const avgVolume = totalVolume / samples;

            resolve({
              isAudible: avgVolume > threshold,
              avgVolume,
              samples,
            });
          }, duration);
        });
      } catch (error) {
        return {
          isAudible: false,
          avgVolume: 0,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [selector, durationMs, volumeThreshold] as [string, number, number],
  );

  expect(result.isAudible).toBe(true);
  expect(result.avgVolume).toBeGreaterThan(volumeThreshold);
}

/**
 * Assert that audio track exists and is active
 */
export async function assertAudioTrackActive(
  page: Page,
  selector: string = "video",
): Promise<void> {
  const audioState = await page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    if (!video || !video.srcObject) {
      return { hasAudioTrack: false, enabled: false, muted: false };
    }

    const stream = video.srcObject as MediaStream;
    const audioTracks = stream.getAudioTracks();

    if (audioTracks.length === 0) {
      return { hasAudioTrack: false, enabled: false, muted: video.muted };
    }

    const track = audioTracks[0];

    return {
      hasAudioTrack: true,
      enabled: track.enabled,
      readyState: track.readyState,
      muted: video.muted,
      label: track.label,
    };
  }, selector);

  expect(audioState.hasAudioTrack).toBe(true);
  expect(audioState.enabled).toBe(true);
  expect(audioState.readyState).toBe("live");
}

/**
 * Assert that audio has frequency content (not silent)
 */
export async function assertAudioHasFrequencyContent(
  page: Page,
  selector: string = "video",
  durationMs: number = 2000,
  frequencyThreshold: number = 20,
): Promise<void> {
  const result = await page.evaluate(
    async ([sel, duration, threshold]: [string, number, number]): Promise<{
      hasContent: boolean;
      maxLevel?: number;
      avgLevel?: number;
      reason?: string;
    }> => {
      try {
        const videoElement = document.querySelector(sel) as HTMLVideoElement;
        if (!videoElement?.srcObject) {
          return { hasContent: false, reason: "No stream" };
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        const source = audioContext.createMediaStreamSource(videoElement.srcObject as MediaStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        return new Promise((resolve) => {
          let maxFrequencyLevel = 0;
          let avgFrequencyLevel = 0;
          let samples = 0;

          const checkFrequencies = () => {
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            let max = 0;

            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
              if (dataArray[i] > max) max = dataArray[i];
            }

            maxFrequencyLevel = Math.max(maxFrequencyLevel, max);
            avgFrequencyLevel += sum / bufferLength;
            samples++;
          };

          const interval = setInterval(checkFrequencies, 100);

          setTimeout(() => {
            clearInterval(interval);
            source.disconnect();
            void audioContext.close().catch(() => { });

            resolve({
              hasContent: maxFrequencyLevel > threshold,
              maxLevel: maxFrequencyLevel,
              avgLevel: avgFrequencyLevel / samples,
            });
          }, duration);
        });
      } catch (error) {
        return {
          hasContent: false,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [selector, durationMs, frequencyThreshold] as [string, number, number],
  );

  expect(result.hasContent).toBe(true);
  expect(result.maxLevel).toBeGreaterThan(frequencyThreshold);
}

/**
 * Get audio state for debugging
 */
export async function getAudioState(
  page: Page,
  selector: string = "video",
): Promise<{
  hasMediaStream: boolean;
  audioTrackCount: number;
  audioTracks: Array<{
    enabled: boolean;
    readyState: string;
    label: string;
  }>;
  muted: boolean;
}> {
  return page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    if (!video || !video.srcObject) {
      return {
        hasMediaStream: false,
        audioTrackCount: 0,
        audioTracks: [],
        muted: false,
      };
    }

    const stream = video.srcObject as MediaStream;
    const audioTracks = stream.getAudioTracks();

    return {
      hasMediaStream: true,
      audioTrackCount: audioTracks.length,
      audioTracks: audioTracks.map((track) => ({
        enabled: track.enabled,
        readyState: track.readyState,
        label: track.label,
      })),
      muted: video.muted,
    };
  }, selector);
}

/**
 * Assert that audio is muted
 */
export async function assertAudioIsMuted(page: Page, selector: string = "video"): Promise<void> {
  const isMuted = await page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    return video?.muted ?? false;
  }, selector);

  expect(isMuted).toBe(true);
}

/**
 * Assert that audio is unmuted
 */
export async function assertAudioIsUnmuted(page: Page, selector: string = "video"): Promise<void> {
  const isMuted = await page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    return video?.muted ?? true;
  }, selector);

  expect(isMuted).toBe(false);
}
