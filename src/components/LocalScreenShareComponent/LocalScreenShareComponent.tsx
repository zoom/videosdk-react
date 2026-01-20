import React from "react";
import ZoomVideo, { type ScreenShareOption } from "@zoom/videosdk";
import { useSessionUsers } from "../../hooks";

/**
 * Ref type for ScreenshareComponent
 */
export type ScreenshareRef = React.RefObject<{
  requestShare: (options?: ScreenShareOption) => void;
  setOnStateChange: (callback: (isSharing: boolean) => void) => void;
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
    const onStateChangeRef = React.useRef<((isSharing: boolean) => void) | null>(null);
    const enabledRef = React.useRef(false);
    const [enabled, setEnabled] = React.useState(false);
    const [isVideoElement, setIsVideoElement] = React.useState(false);
    const client = ZoomVideo.createClient();
    const inMeeting = client.getSessionInfo().isInMeeting;
    const users = useSessionUsers();

    if (!ScreenshareRef) {
      console.error(
        "Screenshare component ref is not provided, you must pass it from the useScreenshare hook",
      );
      return null;
    }

    React.useEffect(() => {
      enabledRef.current = enabled;
    }, [enabled]);

    React.useEffect(() => {
      if (!inMeeting) {
        return;
      }
      const handler = () => {
        setEnabled(false);
      };
      const client = ZoomVideo.createClient();
      client.on("passively-stop-share", handler);
      setIsVideoElement(client.getMediaStream().isStartShareScreenWithVideoElement());
      return () => {
        client.off("passively-stop-share", handler);
        setEnabled(false);
      };
    }, [inMeeting]);

    // if client.getMediaStream().stopShare() is called we need setEnabled(false)
    const currentUserId = client.getSessionInfo().userId;
    const currentUserSharerOn = users.find((user) => user.userId === currentUserId)?.sharerOn ?? false;
    React.useEffect(() => {
      setEnabled(currentUserSharerOn);
    }, [currentUserSharerOn]);

    const requestShare = React.useCallback((options?: ScreenShareOption) => {
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
        try {
          void mediaStream.stopShareScreen();
        } catch (e) {
          console.error("Can't stopShareScreen", e);
        }
      };
    },
      [client, inMeeting],
    );

    React.useImperativeHandle(ScreenshareRef, () => ({
      requestShare,
      setOnStateChange: (callback: (isSharing: boolean) => void) => {
        onStateChangeRef.current = callback;
        callback(enabledRef.current);
      },
    }));

    React.useEffect(() => {
      onStateChangeRef.current?.(enabled);
    }, [enabled]);

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
