# React Library for Zoom Video SDK

React library that provides custom hooks and components for integrating Zoom Video SDK functionality into React apps. The SDK aims to make using `@zoom/videosdk` easier in React apps for common use-cases while being extensible. It is interoperable with `@zoom/videosdk` and can be used alongside it.

You can find demo apps using this for both [React & Vite](https://github.com/zoom/VideoSDK-React-Quickstart/) and [React & Next.js](https://github.com/zoom/VideoSDK-Nextjs-Quickstart/).

## Features

- **Simple Integration**: Get video chat running in your React app with just a few lines of code
- **Custom Hooks**: Purpose-built hooks for session management, participant handling, and media controls
- **Ready-to-use Components**: Pre-built video player component that manages video subscription and cleanup
- **Flexible & Customizable**: Use alongside existing `@zoom/videosdk` code
- **Screen Sharing**: Built-in screen sharing functionality with local and remote support
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @zoom/videosdk
npm install @zoom/videosdk-react
```

## Prerequisites

- React 18+
- Zoom Video SDK account and credentials

## Project Structure

```
src/
├── components/          # React components
│   ├── index.ts         # Component exports
│   └── ...              # Individual component directories
├── hooks/               # Custom React hooks
│   ├── index.ts         # Hook exports
│   └── ...              # Individual hook directories
├── index.ts             # Main SDK exports
├── utils.ts             # Utility functions
└── test-types.ts        # Type definitions

playground/              # Example application
├── src/
│   ├── App.tsx          # Example application
│   ├── JWT.ts           # JWT token generation
│   └── main.tsx         # Application entry point
```

## Quick Start

### Basic Video Chat Implementation

```tsx
import { useSession, useSessionUsers, VideoPlayerComponent, VideoPlayerContainerComponent } from '@zoom/videosdk-react';

function VideoChat() {
  const { isInSession, isLoading, isError } = useSession("session123", "your_jwt_token", "username");
  
  const participants = useSessionUsers();
  
  if (isLoading) return <div>Joining session...</div>;
  if (isError) return <div>Error joining session</div>;
  
  return (
    <div>
      {isInSession && (
        <VideoPlayerContainerComponent>
          {participants.map(participant => (
            <VideoPlayerComponent key={participant.userId} user={participant} />
          ))}
        </VideoPlayerContainerComponent>
      )}
    </div>
  );
}
```

## Available Hooks

### `useSession`

Manages the complete lifecycle of a Zoom video session.

```tsx
const { isInSession, isLoading, isError, error, mediaErrors } = useSession(
  topic,           // Session topic/ID
  token,           // JWT authentication token
  userName,        // Display name
  sessionPassword, // Optional session password
  sessionIdleTimeoutMins, // Optional idle timeout
  {
    disableVideo: false,
    disableAudio: false,
    language: "en-US",
    dependentAssets: "Global"
  }
);
```

**Options:**
- `disableAudio`: Disable audio when joining
- `disableVideo`: Disable video when joining
- `language`: Session language (default: "en-US")
- `dependentAssets`: Asset loading strategy
- `waitBeforeJoining`: Delay before auto-joining
- `endSessionOnLeave`: End session when host leaves

**Returns:**
- `isInSession`: Whether the session is currently joined
- `isLoading`: Whether a join or reconnect is in flight
- `isError` / `error`: A fatal join/init failure (`ExecutedFailure`) — the session did not join
- `mediaErrors`: Non-fatal per-track failures (`ExecutedFailure[]`) — the session joined, but starting audio and/or video failed. Cleared on reconnect.

### `useSessionUsers`

Provides real-time access to all session participants.

```tsx
const participants = useSessionUsers();

<VideoPlayerContainerComponent>
  {participants.map(participant => (
    <VideoPlayerComponent key={participant.userId}  user={participant} />
  ))}
</VideoPlayerContainerComponent>
```

### `useMyself`

Provides access the local user in the current session.
```tsx
const myself = useMyself();

return (
  <div>
    {myself.userName} - {myself.bVideoOn ? 'Video On' : 'Video Off'}
  </div>
);
```

### `useScreenShareUsers`

Provides real-time access to all session participants who are sharing their screen.

```tsx
const screenshareusers = useScreenShareUsers();

<ScreenShareContainerComponent>
  {screenshareusers.map(userId => (
    <ScreenSharePlayerComponent key={userId} userId={userId} />
  ))}
</ScreenShareContainerComponent>
```

### `useVideoState`

Manages video capture state and controls.

```tsx
const { isVideoOn, toggleVideo, setVideo } = useVideoState();

// Toggle video on/off
<button onClick={() => toggleVideo({ fps: 30 })}>
  {isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
</button>

// Set video state explicitly
<button onClick={() => setVideo(true, { fps: 15 })}>
  Enable Video
</button>
```

### `useAudioState`

Comprehensive audio state management.

```tsx
const { 
  isAudioMuted, 
  isCapturingAudio, 
  toggleMute, 
  toggleCapture,
  setMute,
  setCapture
} = useAudioState();

// Toggle mute
<button onClick={toggleMute}>
  {isAudioMuted ? 'Unmute' : 'Mute'}
</button>

// Toggle audio capture
<button onClick={toggleCapture}>
  {isCapturingAudio ? 'Stop Audio' : 'Start Audio'}
</button>
```

### `useScreenshare`

Manages screen sharing functionality.

```tsx
const { ScreenshareRef, startScreenshare, stopScreenshare, isScreensharing } = useScreenshare();

return (
  <div>
    <LocalScreenShareComponent ref={ScreenshareRef} />
    <button onClick={() => (isScreensharing ? stopScreenshare() : startScreenshare({ audio: true }))}>
      {isScreensharing ? "Stop Screen Share" : "Start Screen Share"}
    </button>
  </div>
);
```

`isScreensharing` reflects the local user's live share state (derived from participant data), so it stays in sync even if the share is stopped elsewhere.

## Components

### `VideoPlayerContainerComponent`

Container wrapper for video players. Must wrap all `VideoPlayerComponent` instances.

```tsx
<VideoPlayerContainerComponent style={{ width: '100%', height: '400px' }}>
  {participants.map(participant => (
    <VideoPlayerComponent key={participant.userId} user={participant} />
  ))}
</VideoPlayerContainerComponent>
```

### `VideoPlayerComponent`

Renders individual participant video streams. Accepts an optional `quality` prop
(`VideoQuality` from `@zoom/videosdk`, default `Video_360P`); changing it re-attaches
the stream at the new quality.

```tsx
import { VideoQuality } from "@zoom/videosdk";

const participants = useSessionUsers()

<VideoPlayerComponent user={participants[0]} quality={VideoQuality.Video_720P} />
```

### `ScreenShareContainerComponent`

Container wrapper for screen share players. Must wrap all `ScreenSharePlayerComponent` instances.

```tsx
const screenshareusers = useScreenShareUsers();

<ScreenShareContainerComponent style={{ width: '100%', height: '400px' }}>
  {screenshareusers.map(userId => (
    <ScreenSharePlayerComponent key={userId} userId={userId} />
  ))}
</ScreenShareContainerComponent>
```

### `ScreenSharePlayerComponent`

Renders individual participant video streams.

```tsx
const screenshareusers = useScreenShareUsers();

<ScreenSharePlayerComponent userId={screenshareusers[0]} />
```

## Running the Project

```bash
# Install dependencies
npm install

# Copy example.env to .env and fill in the values
cp example.env .env

# Start development server
npm run dev
```

Use of this project is subject to our [Terms of Use](https://www.zoom.com/en/trust/video-sdk-terms/).
