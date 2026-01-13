import React from "react";

/**
 * @internal
 * React context for sharing video container reference
 * Used internally by ScreenSharePlayerComponent to access the video container
 */
export const ScreenSharePlayerContext =
  React.createContext<React.RefObject<HTMLDivElement | null> | null>(null);

/**
 * Props for ScreenShareContainerComponent
 */
export type ScreenShareContainerProps = {
  /** Child components to render inside the container */
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

/**
 * Container component for video players
 *
 * This component creates a video-player-container element that serves as the parent
 * for all ScreenSharePlayerComponent instances. It provides the context needed for
 * video elements to be properly attached and managed.
 *
 * @param props - Component props including children and HTML attributes
 * @returns Video player container with context provider
 *
 * @example
 * ```tsx
 * <ScreenShareContainerComponent style={{ width: '100%', height: '400px' }}>
 *   {participants.map(participant => (
 *     <ScreenSharePlayerComponent key={participant.userId} user={participant} />
 *   ))}
 * </ScreenShareContainerComponent>
 * ```
 */
const ScreenShareContainerComponent = ({ children, ...props }: ScreenShareContainerProps) => {
  const screenshareContainerRef = React.useRef<HTMLDivElement | null>(null);
  return (
    // React 18 compat
    // eslint-disable-next-line react-x/no-context-provider
    <ScreenSharePlayerContext.Provider value={screenshareContainerRef}>
      {/* @ts-expect-error html component */}
      <video-player-container ref={screenshareContainerRef} {...props} />
      {children}
    </ScreenSharePlayerContext.Provider>
  );
};

export default ScreenShareContainerComponent;
