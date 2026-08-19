import React from "react";
import ZoomVideo, {
  type InitOptions,
  ConnectionState,
  type ConnectionChangePayload,
  type AudioOption,
  type CaptureVideoOption,
  type ExecutedFailure,
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
  audioOptions?: AudioOption;
  /** Video configuration options from @zoom/videosdk */
  videoOptions?: CaptureVideoOption;
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
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  dependentAssets?: string | "CDN" | "Global" | "CN";
  /** Additional initialization options from @zoom/videosdk */
  initOptions?: InitOptions;
};

/**
 * Combined session configuration options
 */
export type SessionOptions = SessionMediaOptions & SessionInitOptions;

/** Coerce an unknown thrown value into the SDK's ExecutedFailure shape */
const toExecutedFailure = (e: unknown): ExecutedFailure => {
  if (e && typeof e === "object" && "reason" in e) {
    return e as ExecutedFailure;
  }
  return { type: "INTERNAL_ERROR", reason: String(e), errorCode: -1 };
};

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
 * @returns Object with `isInSession`, `isLoading`, `isError`, `error` (fatal join/init
 * failure), and `mediaErrors` (non-fatal per-track failures — the session joined, but
 * starting audio and/or video failed)
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
  sessionOptions?: SessionOptions,
) => {
  const client = ZoomVideo.createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInSession, setInSession] = React.useState(false);
  const [isError, setIsError] = React.useState<boolean>(false);
  const [error, setError] = React.useState<ExecutedFailure | null>(null);
  // Errors from starting audio/video — the session is joined, but a track may have failed
  const [mediaErrors, setMediaErrors] = React.useState<ExecutedFailure[]>([]);

  // True while a reconnect is in flight, so Connected knows to clear isLoading itself —
  // on a reconnect there's no initSession run to do it.
  const reconnectingRef = React.useRef(false);

  const connectionHandler = ({ state }: ConnectionChangePayload) => {
    if (state === ConnectionState.Closed) {
      setInSession(false);
      setIsError(false);
    } else if (state === ConnectionState.Connected) {
      setIsError(false);
      setInSession(true);
      // On the initial join, Connected fires mid-join while tracks are still starting;
      // initSession owns isLoading there. Only clear it ourselves when reconnecting.
      if (reconnectingRef.current) {
        setIsLoading(false);
        reconnectingRef.current = false;
      }
    } else if (state === ConnectionState.Reconnecting) {
      reconnectingRef.current = true;
      setIsLoading(true);
      setIsError(false);
      setInSession(false);
      // Per-track errors from the previous connection no longer reflect reality.
      setMediaErrors([]);
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

    if (!topic || !token || !userName) {
      setIsError(true);
      setError({
        type: "INVALID_PARAMETERS",
        reason: "Missing required parameters: topic, token, userName",
        errorCode: -1,
      } as ExecutedFailure);
      return;
    }

    client.on("connection-change", connectionHandler);

    const initSession = async () => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      setMediaErrors([]);
      try {
        await client.init(language ?? "en-US", dependentAssets ?? "Global", initOptions);
        await client.join(topic, token, userName, sessionPassword, sessionIdleTimeoutMins);
        const mediaStream = client.getMediaStream();
        // Start each requested track independently so one failing doesn't block the other,
        // and surface per-track failures via `mediaErrors` instead of swallowing them.
        const results = await Promise.allSettled([
          disableAudio ? null : mediaStream.startAudio(audioOptions),
          disableVideo ? null : mediaStream.startVideo(videoOptions),
        ]);
        const failures = results
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r) => toExecutedFailure(r.reason));
        if (failures.length) {
          console.warn("Some media tracks failed to start: ", failures);
          setMediaErrors(failures);
        }
        setInSession(true);
      } catch (e: unknown) {
        setIsError(true);
        console.error("Error in session join: ", e);
        setError(toExecutedFailure(e));
      }
      setIsLoading(false);
    };

    void initSession();

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

  return { isInSession, isError, error, isLoading, mediaErrors };
};

export default useSession;
