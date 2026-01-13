import { render, waitFor } from "@testing-library/react";
import type { Participant } from "@zoom/videosdk";
import ZoomVideo from "@zoom/videosdk";
import type { RefObject } from "react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import { ScreenSharePlayerContext } from "../ScreenShareContainerComponent/ScreenShareContainerComponent";
import ScreenSharePlayerComponent from "./ScreenSharePlayerComponent";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

describe("ScreenSharePlayerComponent", () => {
  let mockClient: Mocked<VideoClient>;
  let mockContainerRef: RefObject<HTMLDivElement>;
  let mockMediaStream: Mocked<MediaStream>;
  let mockParticipant: Participant;
  let mockShareViewElement: HTMLElement;
  const userId = 1234;

  beforeEach(() => {
    mockShareViewElement = document.createElement("div");
    mockShareViewElement.setAttribute = vi.fn();

    mockMediaStream = {
      attachShareView: vi.fn().mockResolvedValue(mockShareViewElement),
      detachShareView: vi.fn().mockResolvedValue(mockShareViewElement),
    } as unknown as Mocked<MediaStream>;

    mockParticipant = {
      userId: 1234,
      displayName: "Test User",
      sharerOn: true,
    } as Participant;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
      getAllUser: vi.fn().mockReturnValue([mockParticipant]),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);

    mockContainerRef = {
      current: document.createElement("div"),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should console error when ScreenSharePlayerContext is not provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

    render(<ScreenSharePlayerComponent userId={userId} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Please wrap the ScreenSharePlayerComponent in a ScreenShareContainer"
    );

    consoleSpy.mockRestore();
  });

  it("should not call SDK when context React ref is null", () => {
    const nullRef: RefObject<null> = { current: null };

    render(
      <ScreenSharePlayerContext.Provider value={nullRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    expect(mockMediaStream.attachShareView).not.toHaveBeenCalled();
  });

  it("should call attachShareView when user has sharerOn true", async () => {
    render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachShareView).toHaveBeenCalledWith(userId);
    });
  });

  it("should append share view element to container with data-user-id attribute", async () => {
    render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockShareViewElement.setAttribute).toHaveBeenCalledWith("data-user-id", "1234");
      expect(mockContainerRef.current.contains(mockShareViewElement)).toEqual(true);
    });
  });

  it("should call detachShareView when user has sharerOn false", async () => {
    const mockParticipantSharerOff = { ...mockParticipant, sharerOn: false };
    mockClient.getAllUser = vi.fn().mockReturnValue([mockParticipantSharerOff]);

    render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.detachShareView).toHaveBeenCalledWith(userId);
    });
  });

  it("should gracefully handle attachShareView errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    const attachError = new Error("Failed to attach share view.");

    mockMediaStream.attachShareView.mockRejectedValue(attachError);

    render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ScreenSharePlayer] Error attaching video for userId: 1234"),
        expect.any(String),
        attachError
      );
    });

    consoleSpy.mockRestore();
  });

  it("should call detachShareView on component unmount", async () => {
    const { unmount } = render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachShareView).toHaveBeenCalled();
    });

    vi.clearAllMocks();
    unmount();

    await waitFor(() => {
      expect(mockMediaStream.detachShareView).toHaveBeenCalledWith(userId);
    });
  });

  it("should handle user not found in getAllUser", async () => {
    mockClient.getAllUser = vi.fn().mockReturnValue([]);

    render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.detachShareView).toHaveBeenCalledWith(userId);
    });
  });

  it("should not call attachShareView when element already exists", async () => {
    // First attach the element with the correct attribute before rendering
    const existingElement = document.createElement("div");
    existingElement.setAttribute("data-user-id", String(userId));
    mockContainerRef.current.appendChild(existingElement);

    render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    // Wait a bit to ensure no additional calls
    await new Promise((resolve) => setTimeout(resolve, 100));

    // attachShareView should not be called because element already exists
    expect(mockMediaStream.attachShareView).not.toHaveBeenCalled();
  });

  it("should handle detachShareView errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
    const detachError = new Error("Failed to detach share view.");

    mockMediaStream.detachShareView.mockRejectedValue(detachError);

    const mockParticipantSharerOff = { ...mockParticipant, sharerOn: false };
    mockClient.getAllUser = vi.fn().mockReturnValue([mockParticipantSharerOff]);

    render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "No video element found for userId: ",
        userId,
        detachError
      );
    });

    consoleSpy.mockRestore();
  });

  it("should re-run effect when userId prop changes", async () => {
    const { rerender } = render(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={userId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachShareView).toHaveBeenCalledWith(userId);
    });

    vi.clearAllMocks();

    const newUserId = 5678;
    const newParticipant = {
      userId: newUserId,
      displayName: "New User",
      sharerOn: true,
    } as Participant;
    mockClient.getAllUser = vi.fn().mockReturnValue([newParticipant]);

    rerender(
      <ScreenSharePlayerContext.Provider value={mockContainerRef}>
        <ScreenSharePlayerComponent userId={newUserId} />
      </ScreenSharePlayerContext.Provider>
    );

    await waitFor(() => {
      expect(mockMediaStream.attachShareView).toHaveBeenCalledWith(newUserId);
    });
  });
});
