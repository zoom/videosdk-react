import ZoomVideo from "@zoom/videosdk";
import useSessionUsers from "../useSessionUsers/useSessionUsers";

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
  const client = ZoomVideo.createClient();
  return users.find((user) => user.userId === client.getSessionInfo().userId);;
};

export default useMyself;
