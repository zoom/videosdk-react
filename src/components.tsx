import React from "react";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import { type VideoPlayer as VideoPlayerType } from "@zoom/videosdk";
import type { event_active_share_change, Participant, ScreenShareOption } from "@zoom/videosdk";

/**
 * React context for sharing video container reference
 * Used internally by VideoPlayerComponent to access the video container
 */
const VideoPlayerContext = React.createContext<React.RefObject<HTMLDivElement | null> | null>(null);

/**
 * Props for VideoPlayerContainerComponent
 */
type VideoPlayerContainerProps = {
    /** Child components to render inside the container */
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

/**
 * Container component for video players
 * 
 * This component creates a video-player-container element that serves as the parent
 * for all VideoPlayerComponent instances. It provides the context needed for
 * video elements to be properly attached and managed.
 * 
 * @param props - Component props including children and HTML attributes
 * @returns Video player container with context provider
 * 
 * @example
 * ```tsx
 * <VideoPlayerContainerComponent style={{ width: '100%', height: '400px' }}>
 *   {participants.map(participant => (
 *     <VideoPlayerComponent key={participant.userId} user={participant} />
 *   ))}
 * </VideoPlayerContainerComponent>
 * ```
 */
const VideoPlayerContainerComponent = ({ children, ...props }: VideoPlayerContainerProps) => {
    const videoContainerRef = React.useRef<HTMLDivElement | null>(null);
    return (
        // React 18 compat
        // eslint-disable-next-line react-x/no-context-provider
        <VideoPlayerContext.Provider value={videoContainerRef}>
            {/* @ts-expect-error html component */}
            <video-player-container ref={videoContainerRef} {...props} />
            {children}
        </VideoPlayerContext.Provider>
    )
}

/**
 * Props for VideoPlayerComponent
 */
type VideoPlayerProps = {
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

        const attachVideo = async () => {
            if (!container.querySelector(videoSelector) && user.bVideoOn) {
                const userVideo = await mediaStream.attachVideo(user.userId, quality).catch((e) => {
                    console.error(`%c[VideoPlayer] Error attaching video for userId: ${user.userId}`, "color: orange", e);
                    return null;
                });
                if (userVideo) {
                    (userVideo as HTMLElement).setAttribute('data-user-id', String(user.userId));
                    container.appendChild(userVideo as VideoPlayerType);
                }
            }
        };

        const detachVideo = async () => {
            const element = await mediaStream.detachVideo(user.userId).catch(() => {
                console.warn("No video element found for userId: ", user.userId)
                return null;
            });
            const toRemove = container.querySelectorAll(videoSelector);
            toRemove.forEach((el) => el.remove());
            if (Array.isArray(element)) {
                element.forEach((el) => el.remove());
            } else if (element) {
                element.remove();
            }
        };

        if (user.bVideoOn) { attachVideo() } else { detachVideo() }

        return () => { detachVideo() }
    }, [user.bVideoOn, user.userId, client, videoContainerRef, quality]);
    return (
        <></>
    )
}

/**
 * Props for RemoteScreenShareComponent
 * Extends canvas HTML attributes for styling and behavior
 */
type RemoteScreenShareProps = React.CanvasHTMLAttributes<HTMLCanvasElement>;

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
        const handler: typeof event_active_share_change = (payload) => {
            const stream = client.getMediaStream()
            if (payload.state === 'Active') {
                stream.startShareView(
                    ref.current as HTMLCanvasElement,
                    payload.userId
                )
                setIsRendering(true);
            } else if (payload.state === 'Inactive') {
                stream.stopShareView()
                setIsRendering(false);
            }
        }
        client.on('active-share-change', handler)
        return () => {
            client.off('active-share-change', handler)
        }
    }, [client])
    return (
        <canvas ref={ref} {...props} style={{ display: isRendering ? props.style?.display : 'none' }} />
    )
}

type ScreenshareRef = React.RefObject<{ requestShare: (options?: ScreenShareOption) => void } | null>

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
const LocalScreenShareComponent: React.FC<{ ref: ScreenshareRef }> = React.forwardRef((_, ScreenshareRef) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const client = ZoomVideo.createClient();
    const [enabled, setEnabled] = React.useState(false);
    const [isVideoElement, setIsVideoElement] = React.useState(false);
    const inMeeting = client.getSessionInfo().isInMeeting;

    const handler = () => {
        setEnabled(false)
    }

    React.useEffect(() => {
        client.on('passively-stop-share', handler);
        if (!inMeeting) {
            return
        }
        setIsVideoElement(client.getMediaStream().isStartShareScreenWithVideoElement());
        return () => {
            client.off('passively-stop-share', handler)
            setEnabled(false)
        }
    }, [client, inMeeting])

    React.useImperativeHandle(ScreenshareRef, () => ({
        requestShare,
    }));

    if (!ScreenshareRef) {
        console.error("Screenshare component ref is not provided, you must pass it from the useScreenshare hook")
        return null
    }

    /**
     * Request to start screen sharing
     * @param options - Optional screen share configuration from @zoom/videosdk
     */
    const requestShare = (options?: ScreenShareOption) => {
        if (!inMeeting) {
            return
        }
        const mediaStream = client.getMediaStream();
        const isVideoElementLocal = mediaStream.isStartShareScreenWithVideoElement();
        if (mediaStream.isShareLocked()) {
            console.error('Host locked screenshare')
            return
        }

        if (isVideoElementLocal) {
            mediaStream.startShareScreen(videoRef.current as HTMLVideoElement, options).then(() => {
                setEnabled(true)
            }).catch((e) => {
                setEnabled(false)
                console.error("Failed to start screenshare", e)
            })
        } else {
            mediaStream.startShareScreen(canvasRef.current as HTMLCanvasElement, options).then(() => {
                setEnabled(true)
            }).catch((e) => {
                setEnabled(false)
                console.error("Failed to start screenshare", e)
            })
        }

        return () => {
            mediaStream.stopShareScreen()
        }
    }

    return (
        <>
            <canvas ref={canvasRef} style={{ display: !isVideoElement && enabled ? 'block' : 'none' }} />
            <video ref={videoRef} style={{ display: isVideoElement && enabled ? 'block' : 'none' }} />
        </>
    )
});

export { VideoPlayerComponent, VideoPlayerContainerComponent, LocalScreenShareComponent, RemoteScreenShareComponent };
