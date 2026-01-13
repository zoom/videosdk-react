import React from "react";
import ZoomVideo, { type event_peer_share_state_change } from "@zoom/videosdk";

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
    const handler: typeof event_peer_share_state_change = (e) => {
      if (e.action === 'Start') {
        setScreenShareUsers(p => [...p, e.userId])
      } else {
        setScreenShareUsers(p => p.filter(id => id !== e.userId))
      }
    };
    client.on("peer-share-state-change", handler);
    return () => {
      client.off("peer-share-state-change", handler);
    };
  }, [client]);

  return screenShareUsers;
};

export default useScreenShareUsers;
