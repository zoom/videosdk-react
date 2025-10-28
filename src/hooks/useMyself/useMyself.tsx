import ZoomVideo, { type Participant } from "@zoom/videosdk";
import useSessionUsers from "../useSessionUsers/useSessionUsers";
import { useEffect, useState } from "react";

/**
 * Hook to access the local user in the current session
 *
 * @returns The local user object from @zoom/videosdk
 *
 * @example
 * ```tsx
 * const myself = useMyself();
 *
 * return (
 *   <div>
 *         {myself.userName} - {myself.bVideoOn ? 'Video On' : 'Video Off'}
 *   </div>
 * );
 * ```
 */
const useMyself = () => {
  const users = useSessionUsers();
  const [myself, setMyself] = useState<Participant | null>(null);

  useEffect(() => {
    const client = ZoomVideo.createClient();
    const localUser = users.find(user => user.userId === client.getSessionInfo().userId);
    if (localUser)
      setMyself(localUser);
  }, [users])

  return myself;
};

export default useMyself;
