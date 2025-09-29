import React from "react";
import ZoomVideo, { type ScreenShareOption } from "@zoom/videosdk";

/**
 * Ref type for ScreenshareComponent
 */
export type ScreenshareRef = React.RefObject<{
  requestShare: (options?: ScreenShareOption) => void;
} | null>;

/**
 * Component for displaying the local screen share
 *
 * This component provides the UI elements needed for local screen sharing. Integrates with useScreenshare hook for control.
 *
 * @param props - ScreenshareRef received from useScreenshare hook
 *
 * @returns Canvas and video elements for screen sharing
 *
 * @example
 * ```tsx
 * const { ScreenshareRef, startScreenshare } = useScreenshare();
 *
 * return (
 *   <div>
 *     <LocalScreenShareComponent ref={ScreenshareRef} />
 *     <button onClick={() => startScreenshare({ audio: true })}>
 *       Start Screen Share
 *     </button>
 *   </div>
 * );
 * ```
 */
// For React 18 compat
// eslint-disable-next-line react-x/no-forward-ref
const LocalScreenShareComponent: React.FC<{ ref: ScreenshareRef }> = React.forwardRef(
  (_, ScreenshareRef) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const client = ZoomVideo.createClient();
    const [enabled, setEnabled] = React.useState(false);
    const [isVideoElement, setIsVideoElement] = React.useState(false);
    const inMeeting = client.getSessionInfo().isInMeeting;

    const handler = () => {
      setEnabled(false);
    };

    React.useEffect(() => {
      client.on("passively-stop-share", handler);
      if (!inMeeting) {
        return;
      }
      setIsVideoElement(client.getMediaStream().isStartShareScreenWithVideoElement());
      return () => {
        client.off("passively-stop-share", handler);
        setEnabled(false);
      };
    }, [client, inMeeting]);

    React.useImperativeHandle(ScreenshareRef, () => ({
      requestShare,
    }));

    if (!ScreenshareRef) {
      console.error(
        "Screenshare component ref is not provided, you must pass it from the useScreenshare hook",
      );
      return null;
    }

    const requestShare = (options?: ScreenShareOption) => {
      if (!inMeeting) {
        return;
      }
      const mediaStream = client.getMediaStream();
      const isVideoElementLocal = mediaStream.isStartShareScreenWithVideoElement();
      if (mediaStream.isShareLocked()) {
        console.error("Host locked screenshare");
        return;
      }

      if (isVideoElementLocal) {
        mediaStream
          .startShareScreen(videoRef.current as HTMLVideoElement, options)
          .then(() => {
            setEnabled(true);
          })
          .catch((e) => {
            setEnabled(false);
            console.error("Failed to start screenshare", e);
          });
      } else {
        mediaStream
          .startShareScreen(canvasRef.current as HTMLCanvasElement, options)
          .then(() => {
            setEnabled(true);
          })
          .catch((e) => {
            setEnabled(false);
            console.error("Failed to start screenshare", e);
          });
      }

      return () => {
        mediaStream.stopShareScreen();
      };
    };

    return (
      <>
        <canvas
          ref={canvasRef}
          style={{ display: !isVideoElement && enabled ? "block" : "none" }}
        />
        <video ref={videoRef} style={{ display: isVideoElement && enabled ? "block" : "none" }} />
      </>
    );
  },
);

export default LocalScreenShareComponent;
