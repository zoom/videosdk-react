import React from "react";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import { type VideoPlayer as VideoPlayerType } from "@zoom/videosdk";
import type { Participant } from "@zoom/videosdk";
import { VideoPlayerContext } from "../VideoPlayerContainerComponent/VideoPlayerContainerComponent";
import type { VideoClient } from "../../test-types";

const attachVideo = async (container: HTMLDivElement, videoSelector: string, userId: number, mediaStream: ReturnType<VideoClient["getMediaStream"]>, quality: VideoQuality) => {
  if (!container.querySelector(videoSelector)) {
    const userVideo = await mediaStream.attachVideo(userId, quality).catch((e) => {
      console.error(
        `%c[VideoPlayer] Error attaching video for userId: ${userId}`,
        "color: orange",
        e
      );
      return null;
    });
    if (userVideo) {
      (userVideo as HTMLElement).setAttribute("data-user-id", String(userId));
      container.appendChild(userVideo as VideoPlayerType);
    }
  }
};

const detachVideo = async (container: HTMLDivElement, videoSelector: string, userId: number, mediaStream: ReturnType<VideoClient["getMediaStream"]>) => {
  try {
    const element = await mediaStream.detachVideo(userId);
    const toRemove = container.querySelectorAll(videoSelector);
    toRemove.forEach((el) => el.remove());
    if (Array.isArray(element)) {
      element.forEach((el) => el.remove());
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
  const videoMutexRef = React.useRef(false);
  // For React 18 compat
  // eslint-disable-next-line react-x/no-use-context
  const videoContainerRef = React.useContext(VideoPlayerContext);
  React.useEffect(() => {
    if (!videoContainerRef) {
      console.error("Please wrap the VideoPlayerComponent in a VideoPlayerContainer");
      return;
    }
    const mediaStream = client.getMediaStream();
    if (!videoContainerRef.current) {
      return;
    }
    const container = videoContainerRef.current;
    const videoSelector = `[data-user-id='${user.userId}']`;

    if (videoMutexRef.current) {
      return;
    }
    videoMutexRef.current = true;
    if (user.bVideoOn) {
      void attachVideo(container, videoSelector, user.userId, mediaStream, quality)
        .then(() => {
          videoMutexRef.current = false;
        });
    } else {
      void detachVideo(container, videoSelector, user.userId, mediaStream)
        .then(() => {
          videoMutexRef.current = false;
        });
    }
    return () => {
      void detachVideo(container, videoSelector, user.userId, mediaStream)
        .then(() => {
          videoMutexRef.current = false;
        });
    };
  }, [user.bVideoOn, user.userId, client, videoContainerRef, quality]);
  return <></>;
};

export default VideoPlayerComponent;
