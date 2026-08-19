import { renderHook } from "@testing-library/react";
import type { Participant, ScreenShareOption } from "@zoom/videosdk";
import ZoomVideo from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import useMyself from "../useMyself/useMyself";
import useScreenshare from "./useScreenshare";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

vi.mock("../useMyself/useMyself", () => ({
  default: vi.fn(),
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
    vi.mocked(useMyself).mockReturnValue(undefined);
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

    expect(returnValue).toBe("");
  });

  it("should reflect the local user's share state from useMyself", () => {
    vi.mocked(useMyself).mockReturnValue({ userId: 1, sharerOn: true } as Participant);

    const { result } = renderHook(() => useScreenshare());

    expect(result.current.isScreensharing).toBe(true);
  });

  it("should report not sharing when the local user is not sharing", () => {
    vi.mocked(useMyself).mockReturnValue({ userId: 1, sharerOn: false } as Participant);

    const { result } = renderHook(() => useScreenshare());

    expect(result.current.isScreensharing).toBe(false);
  });
});
