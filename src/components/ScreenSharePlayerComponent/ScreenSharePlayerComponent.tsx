import React from "react";
import ZoomVideo from "@zoom/videosdk";
import type { VideoPlayer } from "@zoom/videosdk";
import { ScreenSharePlayerContext } from "../ScreenShareContainerComponent/ScreenShareContainerComponent";
import type { VideoClient } from "../../test-types";

const attachVideo = async (
  container: HTMLDivElement,
  videoSelector: string,
  userId: number,
  mediaStream: ReturnType<VideoClient["getMediaStream"]>,
): Promise<boolean> => {
  if (container.querySelector(videoSelector)) {
    return false;
  }

  const shareView = await mediaStream.attachShareView(userId).catch((e) => {
    console.error(
      `%c[ScreenSharePlayer] Error attaching video for userId: ${userId}`,
      "color: orange",
      e,
    );
    return null;
  });

  if (shareView) {
    if (!container.querySelector(videoSelector)) {
      (shareView as HTMLElement).setAttribute("data-user-id", String(userId));
      container.appendChild(shareView as VideoPlayer);
      return true;
    } else {
      (shareView as HTMLElement).remove();
      return false;
    }
  }
  return false;
};

const detachVideo = async (
  container: HTMLDivElement,
  videoSelector: string,
  userId: number,
  mediaStream: ReturnType<VideoClient["getMediaStream"]>,
) => {
  const existingElement = container.querySelector(videoSelector);
  if (!existingElement) {
    return;
  }

  try {
    const element = await mediaStream.detachShareView(userId);
    const toRemove = container.querySelectorAll(videoSelector);
    toRemove.forEach((el) => el.remove());
    if (Array.isArray(element)) {
      element.forEach((el) => el.remove());
    } else if (element && (element as unknown as HTMLElement).remove) {
      (element as HTMLElement).remove();
    }
  } catch (err) {
    console.warn("No video element found for userId: ", userId, err);
  }
};

/**
 * Component for rendering individual participant video streams
 *
 * This component automatically handles video stream attachment and detachment
 * based on the participant's video state. It must be used within a
 * ScreenShareContainerComponent to function properly.
 *
 * The component:
 * - Automatically attaches video when participant turns on video
 * - Detaches video when participant turns off video
 * - Handles video quality changes
 * - Manages cleanup on unmount
 *
 * @param props - Component props including user and quality settings
 * @returns Empty fragment (video is attached to container)
 *
 * @example
 * ```tsx
 * <ScreenShareContainerComponent>
 *   {participants.map(participant => (
 *     <ScreenSharePlayerComponent
 *       key={participant.userId}
 *       user={participant}
 *       quality={VideoQuality.Video_720P}
 *     />
 *   ))}
 * </ScreenShareContainerComponent>
 * ```
 */

const ScreenSharePlayerComponent = ({ userId }: { userId: number }) => {
  const isMountedRef = React.useRef(true);
  // For React 18 compat
  // eslint-disable-next-line react-x/no-use-context
  const screenshareContainerRef = React.useContext(ScreenSharePlayerContext);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!screenshareContainerRef) {
      console.error("Please wrap the ScreenSharePlayerComponent in a ScreenShareContainer");
      return;
    }
    const client = ZoomVideo.createClient();
    const mediaStream = client.getMediaStream();
    if (!screenshareContainerRef.current) {
      return;
    }

    const container = screenshareContainerRef.current;
    const videoSelector = `[data-user-id='${userId}']`;

    const user = client.getAllUser().find((u) => u.userId === userId);
    if (user?.sharerOn) {
      void attachVideo(container, videoSelector, userId, mediaStream);
    } else {
      void detachVideo(container, videoSelector, userId, mediaStream);
    }

    return () => {
      // Only detach on true unmount, not React Strict Mode's simulated unmount
      // We defer cleanup slightly to allow React Strict Mode's second mount to run first
      setTimeout(() => {
        if (!isMountedRef.current) {
          void detachVideo(container, videoSelector, userId, mediaStream);
        }
      }, 0);
    };
  }, [screenshareContainerRef, userId]);

  return <></>;
};

export default ScreenSharePlayerComponent;
