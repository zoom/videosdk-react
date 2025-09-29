import React from 'react'
import ZoomVideo, { AudioChangeAction, type AudioOption, type Participant, type InitOptions, type CaptureVideoOption, ConnectionState, type ConnectionChangePayload, type ScreenShareOption } from "@zoom/videosdk";
import { useDeepCompareEffect } from './utils';
import type { ScreenshareRef } from './components';

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
}

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
}

/**
 * Combined session configuration options
 */
export type SessionOptions = SessionMediaOptions & SessionInitOptions

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
    topic: string, token: string, userName: string,
    sessionPassword?: string, sessionIdleTimeoutMins?: number,
    sessionOptions?: SessionOptions,
) => {
    const client = ZoomVideo.createClient();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isInSession, setInSession] = React.useState(false);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    if (!topic || !token || !userName) {
        throw new Error('Missing required parameters: topic, token, userName');
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
    }

    useDeepCompareEffect(() => {
        const { waitBeforeJoining, disableAudio, disableVideo, audioOptions, videoOptions, language, dependentAssets, initOptions, endSessionOnLeave } = sessionOptions ?? {};

        if (waitBeforeJoining) {
            return
        }

        client.on('connection-change', connectionHandler)

        const initSession = async () => {
            setIsLoading(true);
            try {
                await client.init(language ?? "en-US", dependentAssets ?? "Global", initOptions);
                await client.join(topic, token, userName, sessionPassword, sessionIdleTimeoutMins)
                const mediaStream = client.getMediaStream();
                if (!disableAudio && !disableVideo) {
                    await Promise.allSettled([
                        mediaStream.startAudio(audioOptions),
                        mediaStream.startVideo(videoOptions),
                    ]);
                } else if (!disableAudio) {
                    await mediaStream.startAudio(audioOptions)
                } else if (!disableVideo) {
                    await mediaStream.startVideo(videoOptions)
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
            client.off('connection-change', connectionHandler)
            if (client.getSessionInfo().isInMeeting) {
                if (client.isHost()) {
                    client.leave(endSessionOnLeave).catch((e) => console.error("Error in leaving session: ", e));
                } else {
                    if (endSessionOnLeave) { console.warn('User is not host, cannot end session') }
                    client.leave().catch((e) => console.error("Error in leaving session: ", e));
                }
            }
        }
    }, [topic, token, userName, sessionPassword, sessionIdleTimeoutMins, sessionOptions]);

    return { isInSession, isError, error, isLoading };
}
/**
 * Hook to access participants in the current session
 * 
 * @returns Array of Participant objects from @zoom/videosdk
 * 
 * @example
 * ```tsx
 * const participants = useSessionUsers();
 * 
 * return (
 *   <div>
 *     {participants.map(participant => (
 *       <div key={participant.userId}>
 *         {participant.userName} - {participant.bVideoOn ? 'Video On' : 'Video Off'}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
const useSessionUsers = () => {
    const [sessionUsers, setSessionUsers] = React.useState<Array<Participant>>([]);
    const client = ZoomVideo.createClient();

    React.useEffect(() => {
        const handler = () => { setSessionUsers(client.getAllUser()) }
        client.on("user-added", handler);
        client.on("user-removed", handler);
        client.on("user-updated", handler);
        return () => {
            client.off("user-added", handler);
            client.off("user-removed", handler);
            client.off("user-updated", handler);
        }
    }, [client]);

    return sessionUsers;
}

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
    const inMeeting = client.getSessionInfo().isInMeeting

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
        }
    }, [client, inMeeting]);

    /**
     * Toggle video capture on/off
     * @param videoOptions - Optional video configuration options from @zoom/videosdk
     */
    const toggleVideo = async (videoOptions?: CaptureVideoOption) => {
        const mediaStream = client.getMediaStream();
        if (videoState) {
            await mediaStream.stopVideo();
        } else {
            await mediaStream.startVideo(videoOptions);
        }
    }

    /**
     * Set video capture state explicitly
     * @param videoState - Whether to enable video capture
     * @param videoOptions - Optional video configuration options from @zoom/videosdk
     */
    const setVideo = async (videoState: boolean, videoOptions?: CaptureVideoOption) => {
        const mediaStream = client.getMediaStream();
        if (videoState) {
            await mediaStream.startVideo(videoOptions);
        } else {
            await mediaStream.stopVideo();
        }
    }

    return { isVideoOn: videoState, toggleVideo, setVideo };
}

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
    const inMeeting = client.getSessionInfo().isInMeeting

    React.useEffect(() => {
        if (!inMeeting) {
            return
        }
        const mediaStream = client.getMediaStream();
        setIsAudioMuted(mediaStream.isAudioMuted());

        const handler = (e: { action: AudioChangeAction, type: 'phone' | 'computer' }) => {
            if (e.action === AudioChangeAction.Leave) {
                setIsCapturingAudio(false);
                setIsAudioMuted(mediaStream.isAudioMuted());
            } else {
                setIsCapturingAudio(true);
                setIsAudioMuted(mediaStream.isAudioMuted());
            }
        }
        client.on("current-audio-change", handler);
        return () => {
            client.off("current-audio-change", handler);
            setIsCapturingAudio(false);
            setIsAudioMuted(true);
        }
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
    }

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
    }

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
    }

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
    }

    return { isAudioMuted, toggleMute, toggleCapture, setMute, setCapture, isCapturingAudio };
}

/**
 * Hook to share screen
 * 
 * This hook provides a reference to the LocalScreenShareComponent and a function to start screen sharing.
 * The actual screen sharing UI is handled by the LocalScreenShareComponent. Pass the `ScreenshareRef` to
 * the `LocalScreenShareComponent`
 * 
 * @returns Object containing screenshare reference and control function
 * 
 * @example
 * ```tsx
 * const { ScreenshareRef, startScreenshare } = useScreenshare();
 * 
 * return (
 *   <div>
 *     <LocalScreenShareComponent ref={ScreenshareRef} />
 *     <button onClick={() => startScreenshare()}>
 *       Start Screen Share
 *     </button>
 *   </div>
 * );
 * ```
 */
const useScreenshare = () => {
    const ScreenshareRef: ScreenshareRef = React.useRef(null);

    /**
     * Start screen sharing with optional configuration
     * @param options - Optional screen share configuration from @zoom/videosdk
     */
    const startScreenshare = React.useCallback((options?: ScreenShareOption) => {
        if (!ScreenshareRef.current) {
            console.error('Screenshare component not available');
            return;
        }
        ScreenshareRef.current.requestShare(options);
    }, []);

    return {
        ScreenshareRef,
        startScreenshare,
    };
};

export { useSession, useSessionUsers, useVideoState, useAudioState, useScreenshare };
