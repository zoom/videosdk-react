import { act, renderHook, waitFor } from "@testing-library/react";
import ZoomVideo, {
  event_connection_change as ConnectionChangeFn,
  ConnectionState,
} from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import useSession, { type SessionOptions } from "./useSession";

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

describe("useSession", () => {
  let mockClient: Mocked<VideoClient>;
  let mockMediaStream: Mocked<MediaStream>;

  beforeEach(() => {
    mockMediaStream = {
      startAudio: vi.fn().mockResolvedValue(undefined),
      startVideo: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<MediaStream>;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
      getSessionInfo: vi.fn().mockReturnValue({ isInMeeting: true }),
      isHost: vi.fn().mockReturnValue(false),
      init: vi.fn().mockResolvedValue(undefined),
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      off: vi.fn(),
      on: vi.fn(),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error when topic is missing", () => {
    expect(() => {
      renderHook(() => useSession("", "token", "username"));
    }).toThrow("Missing required parameters: topic, token, userName");
  });

  it("should throw error when token is missing", () => {
    expect(() => {
      renderHook(() => useSession("topic", "", "username"));
    }).toThrow("Missing required parameters: topic, token, userName");
  });

  it("should throw error when username is missing", () => {
    expect(() => {
      renderHook(() => useSession("topic", "token", ""));
    }).toThrow("Missing required parameters: topic, token, userName");
  });

  it("should return initial session state properties", () => {
    const { result } = renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, { waitBeforeJoining: true })
    );

    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("isError");
    expect(result.current).toHaveProperty("isInSession");
    expect(result.current).toHaveProperty("isLoading");
  });

  it("should not initialize when waitBeforeJoining is set to true", () => {
    const sessionOptions: SessionOptions = {
      waitBeforeJoining: true,
    };

    renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, sessionOptions)
    );

    expect(mockClient.init).not.toHaveBeenCalled();
    expect(mockClient.join).not.toHaveBeenCalled;
  });

  it("should call Video SDK init method with default options", async () => {
    renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockClient.init).toHaveBeenCalledWith("en-US", "Global", undefined);
    });
  });

  it("should call Video SDK init method with custom options", async () => {
    const sessionOptions: SessionOptions = {
      dependentAssets: "CDN",
      language: "es-ES",
      initOptions: {
        enforceMultipleVideos: true,
      },
    };

    renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, sessionOptions)
    );

    await waitFor(() => {
      expect(mockClient.init).toHaveBeenCalledWith("es-ES", "CDN", { enforceMultipleVideos: true });
    });
  });

  it("should call Video SDK join method with developer-supplied argument values", async () => {
    renderHook(() => useSession("myCustomTopic", "myCustomToken", "John Doe", "password123!", 30));

    await waitFor(() => {
      expect(mockClient.join).toHaveBeenCalledWith(
        "myCustomTopic",
        "myCustomToken",
        "John Doe",
        "password123!",
        30
      );
    });
  });

  it("should start audio and video if neither are disabled by default", async () => {
    renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockMediaStream.startAudio).toHaveBeenCalled();
      expect(mockMediaStream.startVideo).toHaveBeenCalled();
    });
  });

  it("should only start audio when video is disabled", async () => {
    const sessionOptions: SessionOptions = {
      disableVideo: true,
    };

    renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, sessionOptions)
    );

    await waitFor(() => {
      expect(mockMediaStream.startAudio).toHaveBeenCalled();
      expect(mockMediaStream.startVideo).not.toHaveBeenCalled();
    });
  });

  it("should only start video when audio is disabled", async () => {
    const sessionOptions: SessionOptions = {
      disableAudio: true,
    };

    renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, sessionOptions)
    );

    await waitFor(() => {
      expect(mockMediaStream.startAudio).not.toHaveBeenCalled();
      expect(mockMediaStream.startVideo).toHaveBeenCalled();
    });
  });

  it("should not start audio or video when both are disabled", async () => {
    const sessionOptions: SessionOptions = {
      disableAudio: true,
      disableVideo: true,
    };

    renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, sessionOptions)
    );

    await waitFor(() => {
      expect(mockClient.join).toHaveBeenCalled();
    });

    expect(mockMediaStream.startAudio).not.toHaveBeenCalled();
    expect(mockMediaStream.startVideo).not.toHaveBeenCalled();
  });

  it("should pass custom audio and video options to Video SDK", async () => {
    const sessionOptions: SessionOptions = {
      audioOptions: {
        originalSound: true,
      },
      videoOptions: {
        fullHd: true,
      },
    };

    renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, sessionOptions)
    );

    await waitFor(() => {
      expect(mockMediaStream.startAudio).toHaveBeenCalledWith({ originalSound: true });
      expect(mockMediaStream.startVideo).toHaveBeenCalledWith({ fullHd: true });
    });
  });

  it("should set isInSession to true upon successful join", async () => {
    const { result } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(result.current.isInSession).toEqual(true);
    });
  });

  it("should set isError to true when join fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

    mockClient.join.mockRejectedValueOnce(new Error("Join failed"));

    const { result } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isError).toEqual(true);
    });

    consoleSpy.mockRestore();
  });

  it("should register connection-change event listener", async () => {
    renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockClient.on).toHaveBeenCalledWith("connection-change", expect.any(Function));
    });
  });

  it("should unregister connection-change event listener on unmount", async () => {
    const { unmount } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockClient.join).toHaveBeenCalled();
    });

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("connection-change", expect.any(Function));
  });

  it("should set isInSession to true on Connected state", async () => {
    let connectionChangeHandler: typeof ConnectionChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "connection-change") {
        connectionChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockClient.on).toHaveBeenCalled();
    });

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Connected });
    });

    await waitFor(() => {
      expect(result.current.isInSession).toEqual(true);
    });
  });

  it("should set isInSession to false on Closed state", async () => {
    let connectionChangeHandler: typeof ConnectionChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "connection-change") {
        connectionChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(result.current.isInSession).toEqual(true);
    });

    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Closed });
    });

    await waitFor(() => {
      expect(result.current.isInSession).toEqual(false);
    });
  });

  it("should call Video SDK leave method on unmount when in meeting", async () => {
    const { unmount } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockClient.join).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockClient.leave).toHaveBeenCalled();
    });
  });

  it("should call Video SDK leave with true when we are host and endSessionOnLeave is enabled", async () => {
    mockClient.isHost.mockReturnValue(true);

    const sessionOptions: SessionOptions = {
      endSessionOnLeave: true,
    };

    const { unmount } = renderHook(() => {
      useSession("topic", "token", "username", undefined, undefined, sessionOptions);
    });

    await waitFor(() => {
      expect(mockClient.join).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockClient.leave).toHaveBeenCalledWith(true);
    });
  });

  it("should warn when non-host tries to use endSessionOnLeave option", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    mockClient.isHost.mockReturnValue(false);

    const sessionOptions: SessionOptions = {
      endSessionOnLeave: true,
    };

    const { unmount } = renderHook(() =>
      useSession("topic", "token", "username", undefined, undefined, sessionOptions)
    );

    await waitFor(() => {
      expect(mockClient.join).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("User is not host, cannot end session");
    });

    consoleSpy.mockRestore();
  });

  it("should set isLoading to true and isInSession to false on Reconnecting state", async () => {
    let connectionChangeHandler: typeof ConnectionChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "connection-change") {
        connectionChangeHandler = callback;
      }
    });

    const { result } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockClient.on).toHaveBeenCalled();
    });

    // First set to connected
    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Connected });
    });

    await waitFor(() => {
      expect(result.current.isInSession).toEqual(true);
      expect(result.current.isLoading).toEqual(false);
    });

    // Then trigger reconnecting
    act(() => {
      connectionChangeHandler?.({ state: ConnectionState.Reconnecting });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toEqual(true);
      expect(result.current.isInSession).toEqual(false);
      expect(result.current.isError).toEqual(false);
    });
  });

  it("should handle errors when leaving session", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    const leaveError = new Error("Failed to leave session");

    mockClient.leave.mockRejectedValue(leaveError);

    const { unmount } = renderHook(() => useSession("topic", "token", "username"));

    await waitFor(() => {
      expect(mockClient.join).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockClient.leave).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Error in leaving session: ", leaveError);
    });

    consoleSpy.mockRestore();
  });
});
