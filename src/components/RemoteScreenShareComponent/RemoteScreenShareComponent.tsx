import React from "react";
import ZoomVideo from "@zoom/videosdk";
import type { event_active_share_change } from "@zoom/videosdk";

export type RemoteScreenShareProps = React.CanvasHTMLAttributes<HTMLCanvasElement>;

/**
 * Component for displaying remote screen sharing content
 *
 * @param props - Canvas HTML attributes for styling and behavior
 * @returns Canvas element that displays remote screen share content
 *
 * @example
 * ```tsx
 * <RemoteScreenShareComponent
 *   style={{ width: '100%', height: '400px' }}
 *   className="screen-share-canvas"
 * />
 * ```
 */
const RemoteScreenShareComponent = (props: RemoteScreenShareProps) => {
  const client = ZoomVideo.createClient();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = React.useState(false);

  React.useEffect(() => {
    const handler: typeof event_active_share_change = async (payload) => {
      const stream = client.getMediaStream();
      if (payload.state === "Active") {
        try {
          await stream.startShareView(ref.current as HTMLCanvasElement, payload.userId);
        } catch (e) {
          console.error("Failed to start share view", e);
        }
        setIsRendering(true);
      } else if (payload.state === "Inactive") {
        try {
          await stream.stopShareView();
        } catch (e) {
          console.error("Failed to stop share view", e);
        }
        setIsRendering(false);
      }
    };
    client.on("active-share-change", handler);
    return () => {
      client.off("active-share-change", handler);
    };
  }, [client]);
  return (
    <canvas ref={ref} {...props} style={{ display: isRendering ? props.style?.display : "none" }} />
  );
};

export default RemoteScreenShareComponent;
