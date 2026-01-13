# Zoom Video SDK for React

React SDK that provides custom hooks and components for integrating Zoom Video SDK functionality into React apps. The SDK aims to make using `@zoom/videosdk` easier in React apps for common use-cases while being extensible. It is interoperable with `@zoom/videosdk` and can be used alongside it.

## Goals
- Use as much or as little of this SDK along with `@zoom/videosdk`
- Flexibile & Customisable
- Extensible

## Features

- **Session Management**: Easy-to-use hooks for joining and managing Zoom video sessions
- **Participant Handling**: Automatic participant state management and updates
- **Media Controls**: Simple hooks for audio/video state management
- **Video Rendering**: React components for rendering participant video streams
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
├── components/           # React components
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
  const { isInSession, isLoading, isError } = useSession(
    "session123", 
    "your_jwt_token", 
    "User Name"
  );
  
  const participants = useSessionUsers();
  
  if (isLoading) return <div>Joining session...</div>;
  if (isError) return <div>Error joining session</div>;
  
  return (
    <div>
      {isInSession && (
        <VideoPlayerContainerComponent>
          {participants.map(participant => (
            <VideoPlayerComponent 
              key={participant.userId} 
              user={participant} 
            />
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
const { isInSession, isLoading, isError, error } = useSession(
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
const { ScreenshareRef, startScreenshare } = useScreenshare();

return (
  <div>
    <LocalScreenShareComponent ref={ScreenshareRef} />
    <button onClick={() => startScreenshare({ audio: true })}>
      Start Screen Share
    </button>
  </div>
);
```

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

Renders individual participant video streams.

```tsx
const participants = useSessionUsers()

<VideoPlayerComponent user={participants[0]} />
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

