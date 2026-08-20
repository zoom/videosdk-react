import React from "react";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import { type VideoPlayer as VideoPlayerType } from "@zoom/videosdk";
import type { Participant } from "@zoom/videosdk";
import { VideoPlayerContext } from "../VideoPlayerContainerComponent/VideoPlayerContainerComponent";
import type { VideoClient } from "../../test-types";

const attachVideo = async (
  container: HTMLDivElement,
  videoSelector: string,
  userId: number,
  mediaStream: ReturnType<VideoClient["getMediaStream"]>,
  quality: VideoQuality,
): Promise<boolean> => {
  // Check if video element already exists - prevents duplicate attachments
  if (container.querySelector(videoSelector)) {
    return false; // Already attached
  }

  const userVideo = await mediaStream.attachVideo(userId, quality).catch((e) => {
    console.error(
      `%c[VideoPlayer] Error attaching video for userId: ${userId}`,
      "color: orange",
      e,
    );
    return null;
  });

  if (userVideo) {
    // Double-check element wasn't added while we were awaiting
    if (!container.querySelector(videoSelector)) {
      (userVideo as HTMLElement).setAttribute("data-user-id", String(userId));
      // Stamp the rendered quality so we can detect quality changes and re-attach
      (userVideo as HTMLElement).setAttribute("data-video-quality", String(quality));
      container.appendChild(userVideo as VideoPlayerType);
      return true;
    } else {
      // Element was added by another call, clean up our duplicate
      (userVideo as HTMLElement).remove();
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
  // Only detach if element actually exists
  const existingElement = container.querySelector(videoSelector);
  if (!existingElement) {
    return;
  }

  try {
    const element = await mediaStream.detachVideo(userId).catch((e) => {
      console.warn(
        `%c[VideoPlayer] Error detaching video for userId: ${userId}`,
        "color: orange",
        e,
      );
      return null;
    });
    const toRemove = container.querySelectorAll(videoSelector);
    toRemove.forEach((el) => {
      el.remove();
    });
    if (Array.isArray(element)) {
      element.forEach((el) => {
        el.remove();
      });
    } else if (element) {
      element.remove();
    }
  } catch (err) {
    console.warn("No video element found for userId: ", userId, err);
  }
};

/**
 * Props for VideoPlayerComponent
 */
export type VideoPlayerProps = {
  /** Participant object from @zoom/videosdk containing user information */
  user: Participant;
  /** Video quality setting from @zoom/videosdk (default: VideoQuality.Video_360P) */
  quality?: VideoQuality;
};

/**
 * Component for rendering individual participant video streams
 *
 * This component automatically handles video stream attachment and detachment
 * based on the participant's video state. It must be used within a
 * VideoPlayerContainerComponent to function properly.
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
 * <VideoPlayerContainerComponent>
 *   {participants.map(participant => (
 *     <VideoPlayerComponent
 *       key={participant.userId}
 *       user={participant}
 *       quality={VideoQuality.Video_720P}
 *     />
 *   ))}
 * </VideoPlayerContainerComponent>
 * ```
 */
const VideoPlayerComponent = ({ user, quality = VideoQuality.Video_360P }: VideoPlayerProps) => {
  const client = ZoomVideo.createClient();
  // Track if this component instance is mounted - used to prevent cleanup race conditions
  const isMountedRef = React.useRef(true);
  // Quality currently attached for this user — source of truth for re-attach decisions.
  // Reading it back off the DOM races with an in-flight detach/attach (the element may not
  // be appended yet, or may still carry the old quality), so we keep it here instead.
  const attachedQualityRef = React.useRef<VideoQuality | null>(null);
  // Serialize attach/detach so overlapping renders can't interleave them out of order.
  const opChainRef = React.useRef<Promise<unknown>>(Promise.resolve());
  // For React 18 compat
  // eslint-disable-next-line react-x/no-use-context
  const videoContainerRef = React.useContext(VideoPlayerContext);

  // Set mounted state on mount/unmount
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!videoContainerRef) {
      console.error("Please wrap the VideoPlayerComponent in a VideoPlayerContainer");
      return;
    }
    if (!videoContainerRef.current) {
      return;
    }
    // Don't proceed if not in a session
    if (!client.getSessionInfo().isInMeeting) {
      return;
    }

    const mediaStream = client.getMediaStream();
    const container = videoContainerRef.current;
    const videoSelector = `[data-user-id='${user.userId}']`;

    if (user.bVideoOn) {
      const qualityChanged =
        attachedQualityRef.current !== null && attachedQualityRef.current !== quality;
      attachedQualityRef.current = quality;
      // If quality changed for an already-attached stream, detach first so the re-attach
      // takes effect at the new quality (otherwise attachVideo is a no-op). Chained onto
      // any prior op so a rapid quality flip can't run its detach/attach out of order.
      opChainRef.current = opChainRef.current
        .then(async () => {
          if (qualityChanged) {
            await detachVideo(container, videoSelector, user.userId, mediaStream);
          }
          await attachVideo(container, videoSelector, user.userId, mediaStream, quality);
        })
        .catch((e) => {
          // Swallow so one failed op can't permanently reject the chain and stall all
          // future attach/detach for this component.
          console.error("[VideoPlayer] attach op failed", e);
        });
    } else {
      attachedQualityRef.current = null;
      opChainRef.current = opChainRef.current
        .then(() => detachVideo(container, videoSelector, user.userId, mediaStream))
        .catch((e) => {
          console.error("[VideoPlayer] detach op failed", e);
        });
    }

    return () => {
      // Only detach on true unmount, not React Strict Mode's simulated unmount
      setTimeout(() => {
        if (!isMountedRef.current) {
          if (client.getSessionInfo().isInMeeting) {
            // Teardown must run after any queued quality re-attach; otherwise an in-flight
            // attach can append its element after this cleanup has already completed.
            opChainRef.current = opChainRef.current.then(() =>
              detachVideo(container, videoSelector, user.userId, mediaStream),
            );
          } else {
            // Session ended: wait for queued operations before removing their DOM output.
            opChainRef.current = opChainRef.current.then(() => {
              container.querySelectorAll(videoSelector).forEach((el) => el.remove());
            });
          }
        }
      }, 0);
    };
  }, [user.bVideoOn, user.userId, client, videoContainerRef, quality]);

  return <></>;
};

export default VideoPlayerComponent;
