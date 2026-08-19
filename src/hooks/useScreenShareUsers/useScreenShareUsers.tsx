import React from "react";
import ZoomVideo, { type event_peer_share_state_change } from "@zoom/videosdk";
import useInMeeting from "../useInMeeting/useInMeeting";

/**
 * Hook to access participants in the current session
 *
 * @returns Array of Participant objects from @zoom/videosdk
 *
 * @example
 * ```tsx
 * const participants = useSessionUsers();
 *
 * return (
 *   <div>
 *     {participants.map(participant => (
 *       <div key={participant.userId}>
 *         {participant.userName} - {participant.bVideoOn ? 'Video On' : 'Video Off'}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
const useScreenShareUsers = () => {
  const [screenShareUsers, setScreenShareUsers] = React.useState<number[]>([]);
  const client = ZoomVideo.createClient();

  React.useEffect(() => {
    // Seed with anyone already sharing — the hook may mount after a share started.
    // Exclude the local user: peer-share-state-change only fires for remote peers, so the
    // local sharer would never appear via events and must not appear via the seed either.
    const currentUserId = client.getSessionInfo().userId;
    setScreenShareUsers(
      client
        .getAllUser()
        .filter((u) => u.sharerOn && u.userId !== currentUserId)
        .map((u) => u.userId),
    );
    const handler: typeof event_peer_share_state_change = (e) => {
      if (e.action === "Start") {
        // Guard against duplicates if the user was already seeded
        setScreenShareUsers((p) => (p.includes(e.userId) ? p : [...p, e.userId]));
      } else {
        setScreenShareUsers((p) => p.filter((id) => id !== e.userId));
      }
    };
    client.on("peer-share-state-change", handler);
    return () => {
      client.off("peer-share-state-change", handler);
    };
  }, [client]);

  // Clear the sharer list when the session closes
  useInMeeting(() => setScreenShareUsers([]));

  return screenShareUsers;
};

export default useScreenShareUsers;
