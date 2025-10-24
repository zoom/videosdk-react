import React from "react";
import ZoomVideo, {
  type InitOptions,
  ConnectionState,
  type ConnectionChangePayload,
} from "@zoom/videosdk";
import { useDeepCompareEffect } from "../../utils";

/**
 * Configuration options for session media settings
 */
export type SessionMediaOptions = {
  /** Whether to disable audio when joining the session */
  disableAudio?: boolean;
  /** Whether to disable video when joining the session */
  disableVideo?: boolean;
  /** Audio configuration options from @zoom/videosdk */
  audioOptions?: any;
  /** Video configuration options from @zoom/videosdk */
  videoOptions?: any;
  /** Whether to wait before automatically joining the session */
  waitBeforeJoining?: boolean;
  /** Whether to end the session when the current user leaves (host only) */
  endSessionOnLeave?: boolean;
};

/**
 * Configuration options for session initialization
 */
export type SessionInitOptions = {
  /** Language setting for the session (default: "en-US") */
  language?: string;
  /** Asset loading strategy: "CDN", "Global", "CN", or custom string */
  dependentAssets?: string | "CDN" | "Global" | "CN";
  /** Additional initialization options from @zoom/videosdk */
  initOptions?: InitOptions;
};

/**
 * Combined session configuration options
 */
export type SessionOptions = SessionMediaOptions & SessionInitOptions;

/**
 * Hook to join a Zoom Video SDK session
 *
 * This hook handles the complete lifecycle of a Zoom video session including:
 * - Session initialization and connection
 * - Audio/video stream initialization
 * - Connection state monitoring
 * - Automatic cleanup on unmount
 *
 * @param topic - The session topic to join
 * @param token - JWT token for authentication
 * @param userName - Display name for the user in the session
 * @param sessionPassword - Optional password for the session
 * @param sessionIdleTimeoutMins - Optional timeout for idle sessions
 * @param sessionOptions - Optional configuration for session behavior
 *
 * @returns Object containing session state and error information
 *
 * @example
 * ```tsx
 * const { isInSession, isLoading, isError, error } = useSession(
 *   "session123",
 *   "jwt_token_here",
 *   "John Doe",
 *   undefined,
 *   30,
 *   {
 *     disableVideo: false,
 *     disableAudio: false,
 *     language: "en-US"
 *   }
 * );
 * ```
 */
const useSession = (
  topic: string,
  token: string,
  userName: string,
  sessionPassword?: string,
  sessionIdleTimeoutMins?: number,
  sessionOptions?: SessionOptions
) => {
  const client = ZoomVideo.createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInSession, setInSession] = React.useState(false);
  const [isError, setIsError] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!topic || !token || !userName) {
    throw new Error("Missing required parameters: topic, token, userName");
  }

  const connectionHandler = ({ state }: ConnectionChangePayload) => {
    if (state === ConnectionState.Closed) {
      setInSession(false);
      setIsError(false);
    } else if (state === ConnectionState.Connected) {
      setIsError(false);
      setInSession(true);
    } else if (state === ConnectionState.Reconnecting) {
      setIsLoading(true);
      setIsError(false);
      setInSession(false);
    }
  };

  useDeepCompareEffect(() => {
    const {
      waitBeforeJoining,
      disableAudio,
      disableVideo,
      audioOptions,
      videoOptions,
      language,
      dependentAssets,
      initOptions,
      endSessionOnLeave,
    } = sessionOptions ?? {};

    if (waitBeforeJoining) {
      return;
    }

    client.on("connection-change", connectionHandler);

    const initSession = async () => {
      setIsLoading(true);
      try {
        await client.init(language ?? "en-US", dependentAssets ?? "Global", initOptions);
        await client.join(topic, token, userName, sessionPassword, sessionIdleTimeoutMins);
        const mediaStream = client.getMediaStream();
        if (!disableAudio && !disableVideo) {
          await Promise.allSettled([
            mediaStream.startAudio(audioOptions),
            mediaStream.startVideo(videoOptions),
          ]);
        } else if (!disableAudio) {
          await mediaStream.startAudio(audioOptions);
        } else if (!disableVideo) {
          await mediaStream.startVideo(videoOptions);
        }
        setInSession(true);
      } catch (e) {
        setIsError(true);
        console.error("Error in session join: ", e);
        setError(e as string);
      }
      setIsLoading(false);
    };

    initSession();

    return () => {
      setInSession(false);
      setIsError(false);
      client.off("connection-change", connectionHandler);
      if (client.getSessionInfo().isInMeeting) {
        if (client.isHost()) {
          client
            .leave(endSessionOnLeave)
            .catch((e) => console.error("Error in leaving session: ", e));
        } else {
          if (endSessionOnLeave) {
            console.warn("User is not host, cannot end session");
          }
          client.leave().catch((e) => console.error("Error in leaving session: ", e));
        }
      }
    };
  }, [topic, token, userName, sessionPassword, sessionIdleTimeoutMins, sessionOptions]);

  return { isInSession, isError, error, isLoading };
};

export default useSession;
