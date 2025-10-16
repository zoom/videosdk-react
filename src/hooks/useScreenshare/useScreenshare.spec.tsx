import { renderHook } from "@testing-library/react";
import type { ScreenShareOption } from "@zoom/videosdk";
import { describe, expect, it, vi } from "vitest";
import useScreenshare from "./useScreenshare";

describe("useScreenshare", () => {
  it("should return ScreenshareRef and startScreenshare", () => {
    const { result } = renderHook(() => useScreenshare());

    expect(result.current.ScreenshareRef).toBeDefined();
    expect(result.current.ScreenshareRef.current).toBeNull();
    expect(result.current.startScreenshare).toBeTypeOf("function");
  });

  it("should call requestShare on React ref when startScreenshare is invoked", () => {
    const mockRequestShare = vi.fn();
    const { result } = renderHook(() => useScreenshare());

    result.current.ScreenshareRef.current = { requestShare: mockRequestShare };
    result.current.startScreenshare();

    expect(mockRequestShare).toHaveBeenCalledWith(undefined);
  });

  it("should call requestShare on React ref with options when startScreenshare is invoked", () => {
    const mockRequestShare = vi.fn();
    const shareOptions: ScreenShareOption = { broadcastToSubsession: true };
    const { result } = renderHook(() => useScreenshare());

    result.current.ScreenshareRef.current = { requestShare: mockRequestShare };
    result.current.startScreenshare(shareOptions);

    expect(mockRequestShare).toHaveBeenCalledWith(shareOptions);
  });

  it("should log error when React ref is not available", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useScreenshare());

    result.current.startScreenshare();

    expect(consoleSpy).toHaveBeenCalledWith("Screenshare component not available");
    expect(result.current.ScreenshareRef.current).toBeNull();

    consoleSpy.mockRestore();
  });
});
