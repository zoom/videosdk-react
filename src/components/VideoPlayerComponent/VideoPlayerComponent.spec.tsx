import { render } from "@testing-library/react";
import type { Participant } from "@zoom/videosdk";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import type { RefObject } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import { VideoPlayerContext } from "../VideoPlayerContainerComponent/VideoPlayerContainerComponent";
import VideoPlayerComponent from "./VideoPlayerComponent";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
  VideoQuality: {
    VIDEO_90P: 0,
    VIDEO_180P: 1,
    VIDEO_360P: 2,
    VIDEO_720P: 3,
    VIDEO_1080P: 4,
  },
}));

describe("VideoPlayerComponent", () => {
  let mockClient: Mocked<VideoClient>;
  let mockContainerRef: RefObject<HTMLDivElement>;
  let mockMediaStream: Mocked<MediaStream>;
  let mockParticipant: Participant;
  let mockVideoElement: HTMLVideoElement;
  let setAttributeSpy: Mock<(qualifiedName: string, value: string) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockVideoElement = document.createElement("video");
    // Spy on setAttribute but let it actually set the attribute (needed for querySelector to work)
    setAttributeSpy = vi.spyOn(mockVideoElement, "setAttribute");

    mockMediaStream = {
      attachVideo: vi.fn().mockResolvedValue(mockVideoElement),
      detachVideo: vi.fn().mockResolvedValue(mockVideoElement),
    } as unknown as Mocked<MediaStream>;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
      getSessionInfo: vi.fn().mockReturnValue({ isInMeeting: true }),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);

    mockContainerRef = {
      current: document.createElement("div"),
    };

    mockParticipant = {
      bVideoOn: true,
      displayName: "Test User",
      userId: 1234,
    } as Participant;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should console error when VideoPlayerContext is not provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<VideoPlayerComponent user={mockParticipant} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Please wrap the VideoPlayerComponent in a VideoPlayerContainer",
    );

    consoleSpy.mockRestore();
  });

  it("should not call SDK when context React ref is null", () => {
    const nullRef: RefObject<null> = { current: null };

    render(
      <VideoPlayerContext.Provider value={nullRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>,
    );

    expect(mockMediaStream.attachVideo).not.toHaveBeenCalled();
  });

  it("should call attachVideo when user has video on", async () => {
    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} quality={VideoQuality.Video_720P} />
      </VideoPlayerContext.Provider>,
    );

    await vi.runAllTimersAsync();
    await vi.waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalledWith(1234, VideoQuality.Video_720P);
    });
  });

  it("should use default video quality if not otherwise specified", async () => {
    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>,
    );

    await vi.runAllTimersAsync();
    await vi.waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalledWith(1234, VideoQuality.Video_360P);
    });
  });

  it("should append video element to container with data-user-id attribute", async () => {
    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>,
    );

    await vi.runAllTimersAsync();
    await vi.waitFor(() => {
      expect(setAttributeSpy).toHaveBeenCalledWith("data-user-id", "1234");
      expect(mockContainerRef.current!.contains(mockVideoElement)).toEqual(true);
    });
  });

  it("should call detachVideo when user has video off", async () => {
    const mockParticipantVideoOff = { ...mockParticipant, bVideoOn: false };

    // Pre-add an element to the container to simulate a video that needs detaching
    const existingElement = document.createElement("video");
    existingElement.setAttribute("data-user-id", "1234");
    mockContainerRef.current!.appendChild(existingElement);

    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipantVideoOff} />
      </VideoPlayerContext.Provider>,
    );

    await vi.waitFor(() => {
      expect(mockMediaStream.detachVideo).toHaveBeenCalledWith(1234);
    });
  });

  it("should gracefully handle attachVideo errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const attachError = new Error("Failed to attach video.");

    mockMediaStream.attachVideo.mockRejectedValue(attachError);

    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>,
    );

    await vi.runAllTimersAsync();
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[VideoPlayer] Error attaching video for userId: 1234"),
        expect.any(String),
        attachError,
      );
    });

    consoleSpy.mockRestore();
  });

  it("should call detachVideo on component unmount", async () => {
    const { unmount } = render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>,
    );

    // Let attach complete
    await vi.runAllTimersAsync();
    await vi.waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalled();
    });

    vi.clearAllMocks();
    unmount();

    // Run timers to execute the deferred cleanup setTimeout
    await vi.runAllTimersAsync();

    expect(mockMediaStream.detachVideo).toHaveBeenCalledWith(1234);
  });

  it("should detach video when participant video turns off from on", async () => {
    const { rerender } = render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>,
    );

    // Let attach complete - the video element will be added to the container
    await vi.runAllTimersAsync();
    await vi.waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalled();
    });

    vi.clearAllMocks();

    const participantVideoOff = { ...mockParticipant, bVideoOn: false };

    rerender(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={participantVideoOff} />
      </VideoPlayerContext.Provider>,
    );

    await vi.waitFor(() => {
      expect(mockMediaStream.detachVideo).toHaveBeenCalledWith(1234);
    });
  });
});
