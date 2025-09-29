import React from "react";
import ZoomVideo from "@zoom/videosdk";

/**
 * Hook to access and manage video state
 *
 * This hook provides video state management including:
 * - Current video capture status
 * - Toggle video on/off functionality
 * - Set video state explicitly
 * - Automatic state synchronization with Zoom Video SDK
 *
 * @returns Object containing video state and control functions
 *
 * @example
 * ```tsx
 * const { isVideoOn, toggleVideo, setVideo } = useVideoState();
 *
 * return (
 *   <div>
 *     <button onClick={() => toggleVideo({ fps: 30 })}>
 *       {isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
 *     </button>
 *     <button onClick={() => setVideo(true, { fps: 15 })}>
 *       Force Video On
 *     </button>
 *   </div>
 * );
 * ```
 */
const useVideoState = () => {
  const client = ZoomVideo.createClient();
  const [videoState, setVideoState] = React.useState<boolean>(false);
  const inMeeting = client.getSessionInfo().isInMeeting;

  React.useEffect(() => {
    if (!inMeeting) {
      return;
    }
    const mediaStream = client.getMediaStream();
    setVideoState(mediaStream.isCapturingVideo());
    const handler = () => setVideoState(mediaStream.isCapturingVideo());
    client.on("video-capturing-change", handler);
    return () => {
      client.off("video-capturing-change", handler);
    };
  }, [client, inMeeting]);

  /**
   * Toggle video capture on/off
   * @param videoOptions - Optional video configuration options from @zoom/videosdk
   */
  const toggleVideo = async (videoOptions?: any) => {
    const mediaStream = client.getMediaStream();
    if (videoState) {
      await mediaStream.stopVideo();
    } else {
      await mediaStream.startVideo(videoOptions);
    }
  };

  /**
   * Set video capture state explicitly
   * @param videoState - Whether to enable video capture
   * @param videoOptions - Optional video configuration options from @zoom/videosdk
   */
  const setVideo = async (videoStateArg: boolean, videoOptions?: any) => {
    const mediaStream = client.getMediaStream();
    if (videoStateArg) {
      await mediaStream.startVideo(videoOptions);
    } else {
      await mediaStream.stopVideo();
    }
  };

  return { isVideoOn: videoState, toggleVideo, setVideo };
};

export default useVideoState;
