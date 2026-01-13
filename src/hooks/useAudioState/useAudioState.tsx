import React from "react";
import ZoomVideo, { AudioChangeAction, type event_current_audio_change, type AudioOption } from "@zoom/videosdk";

/**
 * Hook to access and manage audio state
 *
 * This hook provides comprehensive audio state management including:
 * - Audio mute status
 * - Audio capture status
 * - Mute/unmute functionality
 * - Audio capture start/stop functionality
 * - Automatic state synchronization with Zoom Video SDK
 *
 * @returns Object containing audio state and control functions
 *
 * @example
 * ```tsx
 * const {
 *   isAudioMuted,
 *   isCapturingAudio,
 *   toggleMute,
 *   toggleCapture,
 *   setMute,
 *   setCapture
 * } = useAudioState();
 *
 * return (
 *   <div>
 *     <button onClick={toggleMute}>
 *       {isAudioMuted ? 'Unmute' : 'Mute'}
 *     </button>
 *     <button onClick={() => toggleCapture({ echoCancellation: true })}>
 *       {isCapturingAudio ? 'Stop Audio' : 'Start Audio'}
 *     </button>
 *   </div>
 * );
 * ```
 */
const useAudioState = () => {
  const client = ZoomVideo.createClient();
  const [isAudioMuted, setIsAudioMuted] = React.useState<boolean>(true);
  const [isCapturingAudio, setIsCapturingAudio] = React.useState<boolean>(false);
  const inMeeting = client.getSessionInfo().isInMeeting;

  React.useEffect(() => {
    if (!inMeeting) {
      return;
    }
    const mediaStream = client.getMediaStream();
    setIsAudioMuted(mediaStream.isAudioMuted());

    const handler: typeof event_current_audio_change = (e) => {
      if (e.action === AudioChangeAction.Leave) {
        setIsCapturingAudio(false);
        setIsAudioMuted(mediaStream.isAudioMuted());
      } else {
        setIsCapturingAudio(true);
        setIsAudioMuted(mediaStream.isAudioMuted());
      }
    };
    client.on("current-audio-change", handler);
    return () => {
      client.off("current-audio-change", handler);
      setIsCapturingAudio(false);
      setIsAudioMuted(true);
    };
  }, [client, inMeeting]);

  /**
   * Set audio mute state
   * @param mute - Whether to mute the audio
   */
  const setMute = async (mute: boolean) => {
    const mediaStream = client.getMediaStream();
    if (mute) {
      await mediaStream.muteAudio();
    } else {
      await mediaStream.unmuteAudio();
    }
  };

  /**
   * Set audio capture state
   * @param capture - Whether to capture audio
   * @param audioOptions - Optional audio configuration options from @zoom/videosdk
   */
  const setCapture = async (capture: boolean, audioOptions?: AudioOption) => {
    const mediaStream = client.getMediaStream();
    if (capture) {
      await mediaStream.startAudio(audioOptions);
    } else {
      await mediaStream.stopAudio();
    }
  };

  /**
   * Toggle audio mute state
   */
  const toggleMute = async () => {
    const mediaStream = client.getMediaStream();
    if (isAudioMuted) {
      await mediaStream.unmuteAudio();
    } else {
      await mediaStream.muteAudio();
    }
  };

  /**
   * Toggle audio capture state
   * @param audioOptions - Optional audio configuration options from @zoom/videosdk
   */
  const toggleCapture = async (audioOptions?: AudioOption) => {
    const mediaStream = client.getMediaStream();
    if (isCapturingAudio) {
      await mediaStream.stopAudio();
    } else {
      await mediaStream.startAudio(audioOptions);
    }
  };

  return {
    isAudioMuted,
    toggleMute,
    toggleCapture,
    setMute,
    setCapture,
    isCapturingAudio,
  };
};

export default useAudioState;
