import { act, renderHook, waitFor } from "@testing-library/react";
import ZoomVideo, {
  AudioChangeAction,
  event_current_audio_change as CurrentAudioChangeFn,
  type AudioOption,
  type SessionInfo,
} from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import useAudioState from "./useAudioState";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
  AudioChangeAction: {
    Join: "Join",
    Leave: "Leave",
  },
}));

describe("useAudioState", () => {
  let mockClient: Mocked<VideoClient>;
  let mockMediaStream: Mocked<MediaStream>;

  beforeEach(() => {
    mockMediaStream = {
      isAudioMuted: vi.fn().mockReturnValue(true),
      muteAudio: vi.fn().mockResolvedValue(undefined),
      startAudio: vi.fn().mockResolvedValue(undefined),
      stopAudio: vi.fn().mockResolvedValue(undefined),
      unmuteAudio: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<MediaStream>;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
      getSessionInfo: vi.fn().mockReturnValue({ isInMeeting: true }),
      off: vi.fn(),
      on: vi.fn(),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return state and control functions", () => {
    const { result } = renderHook(() => useAudioState());

    expect(result.current).toHaveProperty("isAudioMuted");
    expect(result.current).toHaveProperty("isCapturingAudio");
    expect(result.current.setCapture).toBeTypeOf("function");
    expect(result.current.setMute).toBeTypeOf("function");
    expect(result.current.toggleCapture).toBeTypeOf("function");
    expect(result.current.toggleMute).toBeTypeOf("function");
  });

  it("should initialize with audio muted and no capturing", () => {
    const { result } = renderHook(() => useAudioState());

    expect(result.current.isAudioMuted).toEqual(true);
    expect(result.current.isCapturingAudio).toEqual(false);
  });

  it("should register current-audio-change event listener when in meeting", () => {
    renderHook(() => useAudioState());

    expect(mockClient.on).toHaveBeenCalledWith("current-audio-change", expect.any(Function));
  });

  it("should unregister current-audio-change event listener when unmounted", () => {
    const { unmount } = renderHook(() => useAudioState());

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("current-audio-change", expect.any(Function));
  });

  it("should not register current-audio-change event listener when not in meeting", () => {
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: false } as SessionInfo);

    renderHook(() => useAudioState());

    expect(mockClient.on).not.toHaveBeenCalled();
  });

  it("should set isCapturingAudio to true when Join event fires", async () => {
    let audioChangeHandler: typeof CurrentAudioChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "current-audio-change") {
        audioChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useAudioState());

    act(() => {
      audioChangeHandler?.({ action: AudioChangeAction.Join, type: "computer" });
    });

    await waitFor(() => {
      expect(result.current.isCapturingAudio).toEqual(true);
    });
  });

  it("should set isCapturingAudio to false when Leave event fires", async () => {
    let audioChangeHandler: typeof CurrentAudioChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "current-audio-change") {
        audioChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useAudioState());

    act(() => {
      audioChangeHandler?.({ action: AudioChangeAction.Join, type: "computer" });
    });

    await waitFor(() => {
      expect(result.current.isCapturingAudio).toEqual(true);
    });

    act(() => {
      audioChangeHandler?.({ action: AudioChangeAction.Leave, type: "computer" });
    });

    await waitFor(() => {
      expect(result.current.isCapturingAudio).toEqual(false);
    });
  });

  it("should call muteAudio when setMute is called with true", async () => {
    const { result } = renderHook(() => useAudioState());

    await result.current.setMute(true);

    expect(mockMediaStream.muteAudio).toHaveBeenCalled();
  });

  it("should call unmuteAudio when setMute is called with false", async () => {
    const { result } = renderHook(() => useAudioState());

    await result.current.setMute(false);

    expect(mockMediaStream.unmuteAudio).toHaveBeenCalled();
  });

  it("should call startAudio with options when setCapture is called with true", async () => {
    const { result } = renderHook(() => useAudioState());
    const audioOptions: AudioOption = { backgroundNoiseSuppression: true };

    await result.current.setCapture(true, audioOptions);

    expect(mockMediaStream.startAudio).toHaveBeenCalledWith(audioOptions);
  });

  it("should call stopAudio when setCapture is called with false", async () => {
    const { result } = renderHook(() => useAudioState());

    await result.current.setCapture(false);

    expect(mockMediaStream.stopAudio).toHaveBeenCalled();
  });

  it("should call muteAudio when toggleMute is called and we are currently unmuted", async () => {
    mockMediaStream.isAudioMuted.mockReturnValue(false);

    const { result } = renderHook(() => useAudioState());

    await result.current.toggleMute();

    expect(mockMediaStream.muteAudio).toHaveBeenCalled();
  });

  it("should call unmuteAudio when toggleMute is called and we are currently muted", async () => {
    mockMediaStream.isAudioMuted.mockReturnValue(true);

    const { result } = renderHook(() => useAudioState());

    await result.current.toggleMute();

    expect(mockMediaStream.unmuteAudio).toHaveBeenCalled();
    expect(mockMediaStream.muteAudio).not.toHaveBeenCalled();
  });

  it("should call startAudio with options when toggleCapture is called and we are not currently capturing", async () => {
    const { result } = renderHook(() => useAudioState());
    const audioOptions: AudioOption = { backgroundNoiseSuppression: true };

    await result.current.toggleCapture(audioOptions);

    expect(mockMediaStream.startAudio).toHaveBeenCalledWith(audioOptions);
  });

  it("should call stopAudio when toggleCapture is called and we are currently capturing", async () => {
    let audioChangeHandler: typeof CurrentAudioChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "current-audio-change") {
        audioChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useAudioState());

    act(() => {
      audioChangeHandler?.({ action: AudioChangeAction.Join, type: "computer" });
    });

    await waitFor(() => {
      expect(result.current.isCapturingAudio).toEqual(true);
    });

    await result.current.toggleCapture();

    expect(mockMediaStream.stopAudio).toHaveBeenCalled();
  });
});
