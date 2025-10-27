import { render, waitFor } from "@testing-library/react";
import type { Participant } from "@zoom/videosdk";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import type { RefObject } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
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

  beforeEach(() => {
    mockVideoElement = document.createElement("video");
    mockVideoElement.setAttribute = vi.fn();

    mockMediaStream = {
      attachVideo: vi.fn().mockResolvedValue(mockVideoElement),
      detachVideo: vi.fn().mockResolvedValue(mockVideoElement),
    } as unknown as Mocked<MediaStream>;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
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
  });

  it("should console error when VideoPlayerContext is not provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<VideoPlayerComponent user={mockParticipant} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Please wrap the VideoPlayerComponent in a VideoPlayerContainer"
    );

    consoleSpy.mockRestore();
  });

  it("should not call SDK when context React ref is null", () => {
    const nullRef: RefObject<null> = { current: null };

    render(
      <VideoPlayerContext.Provider value={nullRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>
    );

    expect(mockMediaStream.attachVideo).not.toHaveBeenCalled();
  });

  it("should call attachVideo when user has video on", async () => {
    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} quality={VideoQuality.Video_720P} />
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalledWith(1234, VideoQuality.Video_720P);
    });
  });

  it("should use default video quality if not otherwise specified", async () => {
    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalledWith(1234, VideoQuality.Video_360P);
    });
  });

  it("should append video element to container with data-user-id attribute", async () => {
    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockVideoElement.setAttribute).toHaveBeenCalledWith("data-user-id", "1234");
      expect(mockContainerRef.current.contains(mockVideoElement)).toEqual(true);
    });
  });

  it("should call detachVideo when user has video off", async () => {
    const mockParticipantVideoOff = { ...mockParticipant, bVideoOn: false };

    render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipantVideoOff} />
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
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
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[VideoPlayer] Error attaching video for userId: 1234"),
        expect.any(String),
        attachError
      );
    });

    consoleSpy.mockRestore();
  });

  it("should call detachVideo on component unmount", async () => {
    const { unmount } = render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalled();
    });

    vi.clearAllMocks();
    unmount();

    await waitFor(() => {
      expect(mockMediaStream.detachVideo).toHaveBeenCalledWith(1234);
    });
  });

  it("should detach video when participant video turns off from on", async () => {
    const { rerender } = render(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={mockParticipant} />
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachVideo).toHaveBeenCalled();
    });

    vi.clearAllMocks();

    const participantVideoOff = { ...mockParticipant, bVideoOn: false };

    rerender(
      <VideoPlayerContext.Provider value={mockContainerRef}>
        <VideoPlayerComponent user={participantVideoOff} />
      </VideoPlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.detachVideo).toHaveBeenCalledWith(1234);
    });
  });
});
