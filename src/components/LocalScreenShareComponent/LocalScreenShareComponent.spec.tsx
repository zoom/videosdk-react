import { act, render, waitFor } from "@testing-library/react";
import ZoomVideo, {
  event_passively_stop_share as PassivelyStopShareFn,
  type ScreenShareOption,
  type SessionInfo,
} from "@zoom/videosdk";
import React, { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import type { ScreenshareRef } from "./LocalScreenShareComponent";
import LocalScreenShareComponent from "./LocalScreenShareComponent";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

describe("LocalScreenShareComponent", () => {
  let mockClient: Mocked<VideoClient>;
  let mockMediaStream: Mocked<MediaStream>;
  let screenshareRef: ScreenshareRef;

  beforeEach(() => {
    mockMediaStream = {
      startShareScreen: vi.fn().mockResolvedValue(undefined),
      stopShareScreen: vi.fn(),
      isStartShareScreenWithVideoElement: vi.fn().mockReturnValue(false),
      isShareLocked: vi.fn().mockReturnValue(false),
    } as unknown as Mocked<MediaStream>;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
      getSessionInfo: vi.fn().mockReturnValue({ isInMeeting: true }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
    screenshareRef = createRef();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render canvas and video elements", () => {
    const { container } = render(<LocalScreenShareComponent ref={screenshareRef} />);

    expect(container.querySelector("canvas")).toBeInTheDocument();
    expect(container.querySelector("video")).toBeInTheDocument();
  });

  it("should hide both elements before sharing begins", () => {
    const { container } = render(<LocalScreenShareComponent ref={screenshareRef} />);

    const canvasElement = container.querySelector("canvas");
    const videoElement = container.querySelector("video");

    expect(canvasElement?.style.display).toEqual("none");
    expect(videoElement?.style.display).toEqual("none");
  });

  it("should render null when a ref is not provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<LocalScreenShareComponent ref={null as any} />);

    expect(container.firstChild).toBeNull();

    consoleSpy.mockRestore();
  });

  it("should register passively-stop-share event listener on mount", () => {
    render(<LocalScreenShareComponent ref={screenshareRef} />);

    expect(mockClient.on).toHaveBeenCalledWith("passively-stop-share", expect.any(Function));
  });

  it("should unregister passively-stop-share event listener on unmount", () => {
    const { unmount } = render(<LocalScreenShareComponent ref={screenshareRef} />);

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("passively-stop-share", expect.any(Function));
  });

  it("should expose requestShare via React ref", () => {
    render(<LocalScreenShareComponent ref={screenshareRef} />);

    expect(screenshareRef.current).toHaveProperty("requestShare");
    expect(typeof screenshareRef.current?.requestShare).toBe("function");
  });

  it("should start share with canvas element", async () => {
    const { container } = render(<LocalScreenShareComponent ref={screenshareRef} />);
    const canvasElement = container.querySelector("canvas");

    screenshareRef.current?.requestShare();

    await waitFor(() => {
      expect(mockMediaStream.startShareScreen).toHaveBeenCalledWith(canvasElement, undefined);
    });
  });

  it("should start share with video element, if allowed", async () => {
    mockMediaStream.isStartShareScreenWithVideoElement.mockReturnValue(true);

    const { container } = render(<LocalScreenShareComponent ref={screenshareRef} />);
    const videoElement = container.querySelector("video");

    screenshareRef.current?.requestShare();

    await waitFor(() => {
      expect(mockMediaStream.startShareScreen).toHaveBeenCalledWith(videoElement, undefined);
    });
  });

  it("should pass share options through to SDK", async () => {
    render(<LocalScreenShareComponent ref={screenshareRef} />);

    const shareOptions: ScreenShareOption = { broadcastToSubsession: true };

    screenshareRef.current?.requestShare(shareOptions);

    await waitFor(() => {
      expect(mockMediaStream.startShareScreen).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        shareOptions,
      );
    });
  });

  it("should show canvas element when share succeeds", async () => {
    const { container } = render(<LocalScreenShareComponent ref={screenshareRef} />);
    const canvasElement = container.querySelector("canvas");

    screenshareRef.current?.requestShare();

    await waitFor(() => {
      expect(canvasElement?.style.display).toEqual("block");
    });
  });

  it("should show video element when share succeeds, if allowed", async () => {
    mockMediaStream.isStartShareScreenWithVideoElement.mockReturnValue(true);

    const { container } = render(<LocalScreenShareComponent ref={screenshareRef} />);
    const videoElement = container.querySelector("video");

    screenshareRef.current?.requestShare();

    await waitFor(() => {
      expect(videoElement?.style.display).toEqual("block");
    });
  });

  it("should not call Video SDK when user is not in a meeting", () => {
    mockClient.getSessionInfo.mockReturnValue({ isInMeeting: false } as SessionInfo);

    render(<LocalScreenShareComponent ref={screenshareRef} />);

    screenshareRef.current?.requestShare();

    expect(mockMediaStream.startShareScreen).not.toHaveBeenCalled();
  });

  it("should not call Video SDK when screen sharing is locked", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockMediaStream.isShareLocked.mockReturnValue(true);

    render(<LocalScreenShareComponent ref={screenshareRef} />);

    screenshareRef.current?.requestShare();

    expect(consoleSpy).toHaveBeenCalledExactlyOnceWith("Host locked screenshare");
    expect(mockMediaStream.startShareScreen).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should hide canvas/video element when passively-stop-share fires", async () => {
    let stopShareHandler: typeof PassivelyStopShareFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "passively-stop-share") {
        stopShareHandler = callback;
      }
    });

    const { container } = render(<LocalScreenShareComponent ref={screenshareRef} />);
    const canvasElement = container.querySelector("canvas");

    screenshareRef.current?.requestShare();

    await waitFor(() => expect(mockMediaStream.startShareScreen).toHaveBeenCalled());
    await waitFor(() => expect(canvasElement?.style.display).toEqual("block"));

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      stopShareHandler?.();
    });

    await waitFor(() => expect(canvasElement?.style.display).toEqual("none"));
  });

  it("should cleanup by stopping screen share, if screen share has started", async () => {
    render(<LocalScreenShareComponent ref={screenshareRef} />);

    const cleanup = screenshareRef.current?.requestShare() as unknown as () => void;

    await waitFor(() => expect(mockMediaStream.startShareScreen).toHaveBeenCalled());

    cleanup?.();

    expect(mockMediaStream.stopShareScreen).toHaveBeenCalled();
  });
});
