import { renderHook, waitFor } from "@testing-library/react";
import ZoomVideo from "@zoom/videosdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Participant } from "@zoom/videosdk";
import useMyself from "./useMyself";

vi.mock("@zoom/videosdk", () => ({
  default: {
    createClient: vi.fn(),
  },
}));

const mockUseSessionUsers = vi.hoisted(() => vi.fn());
vi.mock("../useSessionUsers/useSessionUsers", () => ({
  default: mockUseSessionUsers,
}));


describe("useMyself", () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getSessionInfo: vi.fn().mockReturnValue({ userId: 2 }),
      on: vi.fn(),
      off: vi.fn(),
    };

    vi.mocked(ZoomVideo.createClient).mockReturnValue(mockClient);

    mockUseSessionUsers.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when there is no matching local user", () => {
    const { result } = renderHook(() => useMyself());

    expect(result.current).toBeNull();
  });

  it("should return the local participant when present", async () => {
    const localParticipant: Participant = { userId: 2, displayName: "Local", bVideoOn: true } as Participant;

    mockUseSessionUsers.mockReturnValue([localParticipant]);

    const { result } = renderHook(() => useMyself());

    await waitFor(() => {
      expect(result.current).toEqual(localParticipant);
    });
  });

  it("should return the local participant when the users list changes", async () => {
    const localParticipant: Participant = { userId: 2, displayName: "Local", bVideoOn: true } as Participant;
    mockUseSessionUsers.mockReturnValue([localParticipant]);
    const callOne = renderHook(() => useMyself());
    await waitFor(() => {
      expect(callOne.result.current).toEqual(localParticipant);
    });

    const remoteParticipant: Participant = { userId: 3, displayName: "Remote", bVideoOn: false } as Participant;
    mockUseSessionUsers.mockReturnValue([localParticipant, remoteParticipant]);
    const callTwo = renderHook(() => useMyself());
    await waitFor(() => {
      expect(callTwo.result.current).toEqual(localParticipant);
    });
  });
});


