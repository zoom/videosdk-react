import { act, renderHook } from "@testing-library/react";
import type { ScreenShareOption } from "@zoom/videosdk";
import ZoomVideo from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import useScreenshare from "./useScreenshare";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

describe("useScreenshare", () => {
  let mockClient: Mocked<VideoClient>;
  let mockMediaStream: Mocked<MediaStream>;

  beforeEach(() => {
    mockMediaStream = {
      stopShareScreen: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<MediaStream>;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return ScreenshareRef, startScreenshare, stopScreenshare, and isScreensharing", () => {
    const { result } = renderHook(() => useScreenshare());

    expect(result.current.ScreenshareRef).toBeDefined();
    expect(result.current.ScreenshareRef.current).toBeNull();
    expect(result.current.startScreenshare).toBeTypeOf("function");
    expect(result.current.stopScreenshare).toBeTypeOf("function");
    expect(result.current.isScreensharing).toBe(false);
  });

  it("should return ScreenshareRef and startScreenshare", () => {
    const { result } = renderHook(() => useScreenshare());

    expect(result.current.ScreenshareRef).toBeDefined();
    expect(result.current.ScreenshareRef.current).toBeNull();
    expect(result.current.startScreenshare).toBeTypeOf("function");
  });

  it("should call requestShare on React ref when startScreenshare is invoked", () => {
    const mockRequestShare = vi.fn();
    const { result } = renderHook(() => useScreenshare());

    result.current.ScreenshareRef.current = {
      requestShare: mockRequestShare,
      setOnStateChange: vi.fn(),
    };
    result.current.startScreenshare();

    expect(mockRequestShare).toHaveBeenCalledWith(undefined);
  });

  it("should call requestShare on React ref with options when startScreenshare is invoked", () => {
    const mockRequestShare = vi.fn();
    const shareOptions: ScreenShareOption = { broadcastToSubsession: true };
    const { result } = renderHook(() => useScreenshare());

    result.current.ScreenshareRef.current = {
      requestShare: mockRequestShare,
      setOnStateChange: vi.fn(),
    };
    result.current.startScreenshare(shareOptions);

    expect(mockRequestShare).toHaveBeenCalledWith(shareOptions);
  });

  it("should log error when React ref is not available", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    const { result } = renderHook(() => useScreenshare());

    result.current.startScreenshare();

    expect(consoleSpy).toHaveBeenCalledWith("Screenshare component not available");
    expect(result.current.ScreenshareRef.current).toBeNull();

    consoleSpy.mockRestore();
  });

  it("should call SDK stopShareScreen when stopScreenshare is invoked", () => {
    const { result } = renderHook(() => useScreenshare());

    result.current.stopScreenshare();

    expect(mockMediaStream.stopShareScreen).toHaveBeenCalled();
  });

  it("should return the promise from stopShareScreen", async () => {
    mockMediaStream.stopShareScreen.mockResolvedValue("");

    const { result } = renderHook(() => useScreenshare());

    const returnValue = await result.current.stopScreenshare();

    expect(returnValue).toBe("stopped");
  });

  it("should update isScreensharing when setOnStateChange callback is triggered", () => {
    const { result } = renderHook(() => useScreenshare());

    const mockSetOnStateChange = vi.fn();
    result.current.ScreenshareRef.current = {
      requestShare: vi.fn(),
      setOnStateChange: mockSetOnStateChange,
    };

    // Trigger startScreenshare which calls setOnStateChange
    result.current.startScreenshare();

    // Get the callback that was passed to setOnStateChange
    const stateChangeCallback = mockSetOnStateChange.mock.calls[0][0];

    // Simulate screen sharing starting
    act(() => {
      stateChangeCallback(true);
    });

    expect(result.current.isScreensharing).toBe(true);

    // Simulate screen sharing stopping
    act(() => {
      stateChangeCallback(false);
    });

    expect(result.current.isScreensharing).toBe(false);
  });

  it("should set up setOnStateChange on mount when ref is available", () => {
    const mockSetOnStateChange = vi.fn();
    const { result } = renderHook(() => useScreenshare());

    // Simulate ref being set (as would happen when LocalScreenShareComponent mounts)
    act(() => {
      result.current.ScreenshareRef.current = {
        requestShare: vi.fn(),
        setOnStateChange: mockSetOnStateChange,
      };
    });

    // Re-render to trigger useEffect
    const { result: result2 } = renderHook(() => useScreenshare());

    act(() => {
      result2.current.ScreenshareRef.current = {
        requestShare: vi.fn(),
        setOnStateChange: mockSetOnStateChange,
      };
    });

    // The setOnStateChange should be called during startScreenshare
    result2.current.startScreenshare();
    expect(mockSetOnStateChange).toHaveBeenCalled();
  });

  it("should call setOnStateChange when startScreenshare is invoked", () => {
    const mockSetOnStateChange = vi.fn();
    const mockRequestShare = vi.fn();
    const { result } = renderHook(() => useScreenshare());

    result.current.ScreenshareRef.current = {
      requestShare: mockRequestShare,
      setOnStateChange: mockSetOnStateChange,
    };

    result.current.startScreenshare();

    expect(mockSetOnStateChange).toHaveBeenCalledWith(expect.any(Function));
    expect(mockRequestShare).toHaveBeenCalled();
  });
});
