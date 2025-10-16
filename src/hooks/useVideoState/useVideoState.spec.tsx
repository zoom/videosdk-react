import { act, renderHook, waitFor } from "@testing-library/react";
import ZoomVideo, {
  event_video_capturing_change as VideoCapturingChangeFn,
  type CaptureVideoOption,
  type SessionInfo,
} from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import useVideoState from "./useVideoState";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

describe("useVideoState", () => {
  let mockClient: Mocked<VideoClient>;
  let mockMediaStream: Mocked<MediaStream>;

  beforeEach(() => {
    mockMediaStream = {
      isCapturingVideo: vi.fn().mockReturnValue(false),
      startVideo: vi.fn().mockResolvedValue(undefined),
      stopVideo: vi.fn().mockResolvedValue(undefined),
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
    const { result } = renderHook(() => useVideoState());

    expect(result.current).toHaveProperty("isVideoOn");
    expect(result.current.setVideo).toBeTypeOf("function");
    expect(result.current.toggleVideo).toBeTypeOf("function");
  });

  it("should initialize with state fetched from Video SDK", () => {
    mockMediaStream.isCapturingVideo.mockReturnValue(true);

    const { result } = renderHook(() => useVideoState());

    expect(result.current.isVideoOn).toEqual(true);
  });

  it("should register video-capturing-change event listener when in meeting", () => {
    renderHook(() => useVideoState());

    expect(mockClient.on).toHaveBeenCalledWith("video-capturing-change", expect.any(Function));
  });

  it("should unregister video-capturing-change event listener on unmount", () => {
    const { unmount } = renderHook(() => useVideoState());

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("video-capturing-change", expect.any(Function));
  });

  it("should not register event listener when not in meeting", () => {
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: false } as SessionInfo);

    renderHook(() => useVideoState());

    expect(mockClient.on).not.toHaveBeenCalled();
  });

  it("should update state when video-capturing-change event fires", async () => {
    let videoChangeHandler: typeof VideoCapturingChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "video-capturing-change") {
        videoChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useVideoState());

    expect(result.current.isVideoOn).toEqual(false);

    mockMediaStream.isCapturingVideo.mockReturnValue(true);

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      videoChangeHandler?.();
    });

    await waitFor(() => {
      expect(result.current.isVideoOn).toEqual(true);
    });
  });

  it("should call startVideo when toggleVideo is called and video is off", async () => {
    mockMediaStream.isCapturingVideo.mockReturnValue(false);

    const { result } = renderHook(() => useVideoState());

    await result.current.toggleVideo();

    expect(mockMediaStream.startVideo).toHaveBeenCalledWith(undefined);
    expect(mockMediaStream.stopVideo).not.toHaveBeenCalled();
  });

  it("should call stopVideo when toggleVideo is called and video is on", async () => {
    mockMediaStream.isCapturingVideo.mockReturnValue(true);

    const { result } = renderHook(() => useVideoState());

    await result.current.toggleVideo();

    expect(mockMediaStream.stopVideo).toHaveBeenCalled();
    expect(mockMediaStream.startVideo).not.toHaveBeenCalled();
  });

  it("should call startVideo with options when toggling video on", async () => {
    mockMediaStream.isCapturingVideo.mockReturnValue(false);

    const { result } = renderHook(() => useVideoState());

    const videoOptions: CaptureVideoOption = {
      fps: 30,
      fullHd: true,
    };

    await result.current.toggleVideo(videoOptions);

    expect(mockMediaStream.startVideo).toHaveBeenCalledWith(videoOptions);
  });

  it("should call startVideo when setVideo called with true", async () => {
    const { result } = renderHook(() => useVideoState());

    await result.current.setVideo(true);

    expect(mockMediaStream.startVideo).toHaveBeenCalledWith(undefined);
  });

  it("should call stopVideo when setVideo called with false", async () => {
    const { result } = renderHook(() => useVideoState());

    await result.current.setVideo(false);

    expect(mockMediaStream.stopVideo).toHaveBeenCalled();
  });

  it("should pass custom options to startVideo when setVideo is called with true and options", async () => {
    const { result } = renderHook(() => useVideoState());

    const videoOptions: CaptureVideoOption = {
      fps: 15,
    };

    await result.current.setVideo(true, videoOptions);

    expect(mockMediaStream.startVideo).toHaveBeenCalledWith(videoOptions);
  });

  it("should track video state through multiple changes", async () => {
    let videoChangeHandler: typeof VideoCapturingChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "video-capturing-change") {
        videoChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useVideoState());

    expect(result.current.isVideoOn).toEqual(false);

    mockMediaStream.isCapturingVideo.mockReturnValue(true);

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      videoChangeHandler?.();
    });

    await waitFor(() => {
      expect(result.current.isVideoOn).toBe(true);
    });

    mockMediaStream.isCapturingVideo.mockReturnValue(false);

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      videoChangeHandler?.();
    });

    await waitFor(() => {
      expect(result.current.isVideoOn).toBe(false);
    });

    mockMediaStream.isCapturingVideo.mockReturnValue(true);

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      videoChangeHandler?.();
    });

    await waitFor(() => expect(result.current.isVideoOn).toBe(true));
  });
});
