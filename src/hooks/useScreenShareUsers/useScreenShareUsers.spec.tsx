import { act, renderHook, waitFor } from "@testing-library/react";
import ZoomVideo, {
  ConnectionState,
  type event_connection_change,
  type event_peer_share_state_change,
} from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { VideoClient } from "../../test-types";
import useScreenShareUsers from "./useScreenShareUsers";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
  ConnectionState: {
    Closed: "Closed",
    Connected: "Connected",
    Reconnecting: "Reconnecting",
  },
}));

describe("useScreenShareUsers", () => {
  let mockClient: Mocked<VideoClient>;
  let shareStateChangeHandler:
    | ((e: Parameters<typeof event_peer_share_state_change>[0]) => void)
    | undefined;
  let connectionChangeHandler: typeof event_connection_change | undefined;

  beforeEach(() => {
    mockClient = {
      getAllUser: vi.fn().mockReturnValue([]),
      getSessionInfo: vi.fn().mockReturnValue({ isInMeeting: false }),
      off: vi.fn(),
      on: vi.fn().mockImplementation((event: string, callback: (payload: any) => void) => {
        if (event === "peer-share-state-change") {
          shareStateChangeHandler = callback;
        } else if (event === "connection-change") {
          connectionChangeHandler = callback;
        }
      }),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
    shareStateChangeHandler = undefined;
    connectionChangeHandler = undefined;
  });

  it("should initially return an empty array", () => {
    const { result } = renderHook(() => useScreenShareUsers());

    expect(result.current).toEqual([]);
  });

  it("should seed with users already sharing on mount", () => {
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: true, userId: 999 } as ReturnType<
      VideoClient["getSessionInfo"]
    >);
    mockClient.getAllUser.mockReturnValue([
      { userId: 1, sharerOn: true },
      { userId: 2, sharerOn: false },
      { userId: 3, sharerOn: true },
    ] as ReturnType<VideoClient["getAllUser"]>);

    const { result } = renderHook(() => useScreenShareUsers());

    expect(result.current).toEqual([1, 3]);
  });

  it("should not seed the local user even if they are sharing", () => {
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: true, userId: 1 } as ReturnType<
      VideoClient["getSessionInfo"]
    >);
    mockClient.getAllUser.mockReturnValue([
      { userId: 1, sharerOn: true },
      { userId: 2, sharerOn: true },
    ] as ReturnType<VideoClient["getAllUser"]>);

    const { result } = renderHook(() => useScreenShareUsers());

    // Local user (1) is excluded — peer-share-state-change never reports the local sharer
    expect(result.current).toEqual([2]);
  });

  it("should not add a duplicate userId when a seeded sharer fires a Start event", async () => {
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: true, userId: 999 } as ReturnType<
      VideoClient["getSessionInfo"]
    >);
    mockClient.getAllUser.mockReturnValue([
      { userId: 1, sharerOn: true },
    ] as ReturnType<VideoClient["getAllUser"]>);

    const { result } = renderHook(() => useScreenShareUsers());

    expect(result.current).toEqual([1]);

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });
  });

  it("should clear sharers when the connection closes", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });

    // The SDK may retain the previous participant snapshot briefly after Closed.
    mockClient.getAllUser.mockReturnValue([
      { userId: 1, sharerOn: true },
    ] as ReturnType<VideoClient["getAllUser"]>);

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Closed });
    });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("should seed already-active sharers on join when mounted before the session connects", async () => {
    // The hook is mounted before joining: no session yet, so getAllUser() is empty.
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: false } as ReturnType<
      VideoClient["getSessionInfo"]
    >);
    mockClient.getAllUser.mockReturnValue([]);

    const { result } = renderHook(() => useScreenShareUsers());

    expect(result.current).toEqual([]);

    // The session connects and a peer is *already* sharing. peer-share-state-change does
    // not replay for an already-active share, so the seed must re-run on join to catch it.
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: true, userId: 1 } as ReturnType<
      VideoClient["getSessionInfo"]
    >);
    mockClient.getAllUser.mockReturnValue([
      { userId: 1, sharerOn: false },
      { userId: 2, sharerOn: true },
    ] as ReturnType<VideoClient["getAllUser"]>);

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Connected });
    });

    await waitFor(() => {
      expect(result.current).toEqual([2]);
    });
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
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });
  });

  it("should remove userId when action is not Start", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    // First add a user
    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });

    // Then remove the user
    act(() => {
      shareStateChangeHandler?.({ action: "Stop", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("should handle multiple users sharing screens", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 2 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1, 2]);
    });
  });

  it("should only remove the specific userId when action is not Start", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    // Add multiple users
    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 2 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 3 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1, 2, 3]);
    });

    // Remove only user 2
    act(() => {
      shareStateChangeHandler?.({ action: "Stop", userId: 2 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1, 3]);
    });
  });

  it("should handle multiple start/stop events for the same user", async () => {
    const { result } = renderHook(() => useScreenShareUsers());

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Stop", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    act(() => {
      shareStateChangeHandler?.({ action: "Start", userId: 1 } as Parameters<
        typeof event_peer_share_state_change
      >[0]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([1]);
    });
  });
});
