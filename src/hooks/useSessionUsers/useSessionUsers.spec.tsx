import { act, renderHook, waitFor } from "@testing-library/react";
import type { Participant } from "@zoom/videosdk";
import ZoomVideo, {
  event_user_add as UserAddedFn,
  event_user_remove as UserRemovedFn,
  event_user_update as UserUpdatedFn,
} from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import type { VideoClient } from "../../test-types";
import useSessionUsers from "./useSessionUsers";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

describe("useSessionUsers", () => {
  let mockClient: Mocked<VideoClient>;
  let mockParticipants: Participant[];

  beforeEach(() => {
    mockParticipants = [
      { userId: 1, displayName: "User 1", bVideoOn: true } as Participant,
      { userId: 2, displayName: "User 2", bVideoOn: false } as Participant,
    ];

    mockClient = {
      getAllUser: vi.fn().mockReturnValue(mockParticipants),
      off: vi.fn(),
      on: vi.fn(),
    } as unknown as Mocked<VideoClient>;

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initially return an empty array", () => {
    const { result } = renderHook(() => useSessionUsers());

    expect(result.current).toEqual([]);
  });

  it("should register user-added event listener on mount", () => {
    renderHook(() => useSessionUsers());

    expect(mockClient.on).toHaveBeenCalledWith("user-added", expect.any(Function));
  });

  it("should register user-removed event listener on mount", () => {
    renderHook(() => useSessionUsers());

    expect(mockClient.on).toHaveBeenCalledWith("user-removed", expect.any(Function));
  });

  it("should register user-updated event listener on mount", () => {
    renderHook(() => useSessionUsers());

    expect(mockClient.on).toHaveBeenCalledWith("user-updated", expect.any(Function));
  });

  it("should unregister user-added event listener on unmount", () => {
    const { unmount } = renderHook(() => useSessionUsers());

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("user-added", expect.any(Function));
  });

  it("should unregister user-removed event listener on unmount", () => {
    const { unmount } = renderHook(() => useSessionUsers());

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("user-removed", expect.any(Function));
  });

  it("should unregister user-updated event listener on unmount", () => {
    const { unmount } = renderHook(() => useSessionUsers());

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith("user-updated", expect.any(Function));
  });

  it("should update state when user-added event fires", async () => {
    let userAddedHandler: typeof UserAddedFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "user-added") {
        userAddedHandler = callback;
      }
    });

    const { result } = renderHook(() => useSessionUsers());

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      userAddedHandler?.();
    });

    await waitFor(() => {
      expect(mockClient.getAllUser).toHaveBeenCalled();
      expect(result.current).toEqual(mockParticipants);
    });
  });

  it("should update state when user-removed event fires", async () => {
    let userRemovedHandler: typeof UserRemovedFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "user-removed") {
        userRemovedHandler = callback;
      }
    });

    const { result } = renderHook(() => useSessionUsers());

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      userRemovedHandler?.();
    });

    await waitFor(() => {
      expect(mockClient.getAllUser).toHaveBeenCalled();
      expect(result.current).toEqual(mockParticipants);
    });
  });

  it("should update state when user-updated event fires", async () => {
    let userUpdatedHandler: typeof UserUpdatedFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "user-updated") {
        userUpdatedHandler = callback;
      }
    });

    const { result } = renderHook(() => useSessionUsers());

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      userUpdatedHandler?.();
    });

    await waitFor(() => {
      expect(mockClient.getAllUser).toHaveBeenCalled();
      expect(result.current).toEqual(mockParticipants);
    });
  });

  it("should reflect latest participants on multiple events", async () => {
    let userAddedHandler: typeof UserAddedFn | undefined;

    mockClient.on.mockImplementation((event: string, callback: (payload: any) => void) => {
      if (event === "user-added") {
        userAddedHandler = callback;
      }
    });

    const { result } = renderHook(() => useSessionUsers());

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      userAddedHandler?.();
    });

    const updatedParticipants = [
      ...mockParticipants,
      { userId: 3, displayName: "User 3", bVideoOn: true } as Participant,
    ];

    mockClient.getAllUser.mockReturnValue(updatedParticipants);

    act(() => {
      // @ts-expect-error: Callback handler executes on any payload
      userAddedHandler?.();
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(3);
      expect(result.current).toEqual(updatedParticipants);
    });
  });
});
