import React from "react";
import ZoomVideo, { ConnectionState, type event_connection_change, type Participant } from "@zoom/videosdk";

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

  React.useEffect(() => {
    const connectionHandler: typeof event_connection_change = (event) => {
      if (event.state === ConnectionState.Closed) {
        setSessionUsers([]);
      }
    };
    client.on("connection-change", connectionHandler);

    return () => {
      client.off("connection-change", connectionHandler);
    };
  }, [client]);

  return sessionUsers;
};

export default useSessionUsers;
