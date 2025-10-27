import React from "react";

/**
 * @internal
 * React context for sharing video container reference
 * Used internally by VideoPlayerComponent to access the video container
 */
export const VideoPlayerContext =
  React.createContext<React.RefObject<HTMLDivElement | null> | null>(null);

/**
 * Props for VideoPlayerContainerComponent
 */
export type VideoPlayerContainerProps = {
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
  );
};

export default VideoPlayerContainerComponent;
