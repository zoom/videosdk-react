import { act, render, waitFor } from "@testing-library/react";
import ZoomVideo, { event_active_share_change as ActiveShareChangeFn } from "@zoom/videosdk";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { MediaStream, VideoClient } from "../../test-types";
import RemoteScreenShareComponent from "./RemoteScreenShareComponent";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

describe("RemoteScreenShareComponent", () => {
  let mockClient: Mocked<VideoClient>;
  let mockMediaStream: Mocked<MediaStream>;

  beforeEach(() => {
    mockMediaStream = {
      startShareView: vi.fn(),
      stopShareView: vi.fn(),
    } as unknown as Mocked<MediaStream>;

    mockClient = {
      getMediaStream: vi.fn().mockReturnValue(mockMediaStream),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render a canvas element", () => {
    const { container } = render(<RemoteScreenShareComponent />);

    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("should initially hide canvas element", () => {
    const { container } = render(<RemoteScreenShareComponent />);
    const canvasElement = container.querySelector("canvas");

    expect(canvasElement?.style.display).toEqual("none");
  });

  it("should register active-share-change event listener on mount", () => {
    render(<RemoteScreenShareComponent />);

    expect(mockClient.on).toHaveBeenCalledWith("active-share-change", expect.any(Function));
  });

  it("should unregister active-share-change event listener on unmount", () => {
    const { unmount } = render(<RemoteScreenShareComponent />);

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("active-share-change", expect.any(Function));
  });

  it("should call startShareView with canvas element when state is Active and userId is provided", async () => {
    let shareChangeHandler: typeof ActiveShareChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "active-share-change") {
        shareChangeHandler = callback;
      }
    });

    const { container } = render(<RemoteScreenShareComponent />);
    const canvasElement = container.querySelector("canvas");

    act(() => {
      shareChangeHandler?.({
        state: "Active",
        userId: 1234,
      });
    });

    await waitFor(() => {
      expect(mockMediaStream.startShareView).toHaveBeenCalledWith(canvasElement, 1234);
    });
  });

  it("should show canvas when state is Active", async () => {
    let shareChangeHandler: typeof ActiveShareChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "active-share-change") {
        shareChangeHandler = callback;
      }
    });

    const { container } = render(<RemoteScreenShareComponent />);
    const canvasElement = container.querySelector("canvas");

    act(() => {
      shareChangeHandler?.({
        state: "Active",
        userId: 1234,
      });
    });

    await waitFor(() => {
      expect(canvasElement?.style.display).not.toEqual("none");
    });
  });

  it("should call stopShareView when state is Inactive", async () => {
    let shareChangeHandler: typeof ActiveShareChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "active-share-change") {
        shareChangeHandler = callback;
      }
    });

    render(<RemoteScreenShareComponent />);

    act(() => {
      shareChangeHandler?.({
        state: "Inactive",
        userId: 1234,
      });
    });

    await waitFor(() => {
      expect(mockMediaStream.stopShareView).toHaveBeenCalled();
    });
  });

  it("should not show canvas when state is Inactive after state was Active", async () => {
    let shareChangeHandler: typeof ActiveShareChangeFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "active-share-change") {
        shareChangeHandler = callback;
      }
    });

    const { container } = render(<RemoteScreenShareComponent />);
    const canvasElement = container.querySelector("canvas");

    act(() => {
      shareChangeHandler?.({
        state: "Active",
        userId: 1234,
      });
    });

    await waitFor(() => {
      expect(canvasElement?.style.display).not.toEqual("none");
    });

    act(() => {
      shareChangeHandler?.({
        state: "Inactive",
        userId: 1234,
      });
    });

    await waitFor(() => {
      expect(canvasElement?.style.display).toEqual("none");
    });
  });

  it("should forward custom properties to canvas element", () => {
    const { container } = render(
      <RemoteScreenShareComponent className="my-custom-class" data-test-id="9876" />
    );

    const canvasElement = container.querySelector("canvas");

    expect(canvasElement).toHaveAttribute("data-test-id", "9876");
    expect(canvasElement).toHaveClass("my-custom-class");
  });
});
