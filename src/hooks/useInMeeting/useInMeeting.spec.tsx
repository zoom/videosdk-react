import { act, renderHook, waitFor } from "@testing-library/react";
import ZoomVideo, {
  ConnectionState,
  event_connection_change as ConnectionChangeFn,
  type SessionInfo,
} from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { VideoClient } from "../../test-types";
import useInMeeting from "./useInMeeting";

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

describe("useInMeeting", () => {
  let mockClient: Mocked<VideoClient>;

  beforeEach(() => {
    mockClient = {
      getSessionInfo: vi.fn().mockReturnValue({ isInMeeting: false }),
      off: vi.fn(),
      on: vi.fn(),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize from the current session membership", () => {
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: true } as SessionInfo);

    const { result } = renderHook(() => useInMeeting());

    expect(result.current).toBe(true);
  });

  it("should register connection-change listener on mount", () => {
    renderHook(() => useInMeeting());

    expect(mockClient.on).toHaveBeenCalledWith("connection-change", expect.any(Function));
  });

  it("should unregister connection-change listener on unmount", () => {
    const { unmount } = renderHook(() => useInMeeting());

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("connection-change", expect.any(Function));
  });

  it("should become true on Connected and false on Closed", async () => {
    let connectionChangeHandler: typeof ConnectionChangeFn | undefined;
    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "connection-change") {
        connectionChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useInMeeting());

    expect(result.current).toBe(false);

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Connected });
    });
    await waitFor(() => expect(result.current).toBe(true));

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Closed });
    });
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("should call onClose when the session closes", async () => {
    let connectionChangeHandler: typeof ConnectionChangeFn | undefined;
    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "connection-change") {
        connectionChangeHandler = callback;
      }
    });
    const onClose = vi.fn();

    renderHook(() => useInMeeting(onClose));

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Connected });
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Closed });
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("should invoke the latest onClose without resubscribing", async () => {
    let connectionChangeHandler: typeof ConnectionChangeFn | undefined;
    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "connection-change") {
        connectionChangeHandler = callback;
      }
    });
    const firstOnClose = vi.fn();
    const secondOnClose = vi.fn();

    const { rerender } = renderHook(({ cb }) => useInMeeting(cb), {
      initialProps: { cb: firstOnClose },
    });

    rerender({ cb: secondOnClose });

    // Listener is registered once, not re-registered when the callback changes
    expect(mockClient.on).toHaveBeenCalledTimes(1);

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Closed });
    });

    await waitFor(() => expect(secondOnClose).toHaveBeenCalledTimes(1));
    expect(firstOnClose).not.toHaveBeenCalled();
  });
});
