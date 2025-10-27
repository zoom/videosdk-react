import React from "react";
import ZoomVideo, { type Participant } from "@zoom/videosdk";

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
const useSessionUsers = () => {
  const [sessionUsers, setSessionUsers] = React.useState<Participant[]>([]);
  const client = ZoomVideo.createClient();

  React.useEffect(() => {
    const handler = () => {
      setSessionUsers(client.getAllUser());
    };
    client.on("user-added", handler);
    client.on("user-removed", handler);
    client.on("user-updated", handler);
    return () => {
      client.off("user-added", handler);
      client.off("user-removed", handler);
      client.off("user-updated", handler);
    };
  }, [client]);

  return sessionUsers;
};

export default useSessionUsers;
