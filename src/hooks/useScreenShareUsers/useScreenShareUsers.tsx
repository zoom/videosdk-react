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
  // Re-run the seed when the user joins: the hook usually mounts before the session
  // connects, so getAllUser() is empty on mount. Clear the list when the session closes.
  const inMeeting = useInMeeting(() => setScreenShareUsers([]));

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!inMeeting) {
      return;
    }

    // Seed with anyone already sharing. Exclude the local user because
    // peer-share-state-change only represents remote peers.
    const currentUserId = client.getSessionInfo().userId;
    const activeRemoteSharers: number[] = [];
    for (const user of client.getAllUser()) {
      if (user.sharerOn && user.userId !== currentUserId) {
        activeRemoteSharers.push(user.userId);
      }
    }
    setScreenShareUsers(activeRemoteSharers);
  }, [client, inMeeting]);

  return screenShareUsers;
};

export default useScreenShareUsers;
