import { act, renderHook, waitFor } from "@testing-library/react";
import ZoomVideo, { type event_peer_share_state_change } from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { VideoClient } from "../../test-types";
import useScreenShareUsers from "./useScreenShareUsers";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

describe("useScreenShareUsers", () => {
  let mockClient: Mocked<VideoClient>;
  let shareStateChangeHandler: ((e: Parameters<typeof event_peer_share_state_change>[0]) => void) | undefined;

  beforeEach(() => {
    mockClient = {
      off: vi.fn(),
      on: vi.fn().mockImplementation((event: string, callback: (payload: any) => void) => {
        if (event === "peer-share-state-change") {
          shareStateChangeHandler = callback;
        }
      }),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
    shareStateChangeHandler = undefined;
  });

  it("should initially return an empty array", () => {
    const { result } = renderHook(() => useScreenShareUsers());

    expect(result.current).toEqual([]);
  });

  it("should register peer-share-state-change event listener on mount", () => {
    renderHook(() => useScreenShareUsers());

    expect(mockClient.on).toHaveBeenCalledWith("peer-share-state-change", expect.any(Function));
  });

  it("should unregister peer-share-state-change event listener on unmount", () => {
    const { unmount } = renderHook(() => useScreenShareUsers());

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("peer-share-state-change", expect.any(Function));
  });

  it("should add userId when action is Start", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });
  });

  it("should remove userId when action is not Start", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    // First add a user
    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });

    // Then remove the user
    act(() => {
      shareStateChangeHandler?.({ action: "Stop", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("should handle multiple users sharing screens", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 2 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1, 2]);
    });
  });

  it("should only remove the specific userId when action is not Start", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    // Add multiple users
    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 2 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 3 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1, 2, 3]);
    });

    // Remove only user 2
    act(() => {
      shareStateChangeHandler?.({ action: "Stop", userId: 2 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1, 3]);
    });
  });

  it("should handle multiple start/stop events for the same user", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Stop", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<typeof event_peer_share_state_change>[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });
  });
});
