import React from "react";
import type { ScreenShareOption } from "@zoom/videosdk";
import type { ScreenshareRef } from "../../components/LocalScreenShareComponent/LocalScreenShareComponent";
import ZoomVideo from "@zoom/videosdk";
import useMyself from "../useMyself/useMyself";

/**
 * Hook to share screen
 *
 * This hook provides a reference to the LocalScreenShareComponent and a function to start screen sharing.
 * The actual screen sharing UI is handled by the LocalScreenShareComponent. Pass the `ScreenshareRef` to
 * the `LocalScreenShareComponent`
 *
 * @returns Object containing screenshare reference and control function
 *
 * @example
 * ```tsx
 * const { ScreenshareRef, startScreenshare } = useScreenshare();
 *
 * return (
 *   <div>
 *     <LocalScreenShareComponent ref={ScreenshareRef} />
 *     <button onClick={() => startScreenshare()}>
 *       Start Screen Share
 *     </button>
 *   </div>
 * );
 * ```
 */
const useScreenshare = () => {
  const ScreenshareRef: ScreenshareRef = React.useRef(null);
  // The local user's share state is already reactive via the SDK's participant data
  const isScreensharing = useMyself()?.sharerOn ?? false;

  /**
   * Start screen sharing with optional configuration
   * @param options - Optional screen share configuration from @zoom/videosdk
   */
  const startScreenshare = React.useCallback((options?: ScreenShareOption) => {
    if (!ScreenshareRef.current) {
      console.error("Screenshare component not available");
      return;
    }
    ScreenshareRef.current.requestShare(options);
  }, []);

  const stopScreenshare = React.useCallback(() => {
    const client = ZoomVideo.createClient();
    return client.getMediaStream().stopShareScreen();
  }, []);

  return {
    ScreenshareRef,
    startScreenshare,
    stopScreenshare,
    isScreensharing,
  };
};

export default useScreenshare;
