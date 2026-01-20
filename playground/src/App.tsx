import { generateSignature } from "./JWT";
import {
  VideoPlayerComponent,
  useSession,
  useSessionUsers,
  useVideoState,
  useAudioState,
  VideoPlayerContainerComponent,
  useScreenshare,
  useScreenShareUsers,
  LocalScreenShareComponent,
  useMyself,
  ScreenShareContainerComponent,
  ScreenSharePlayerComponent,
} from "../../src";
import React, { useMemo } from "react";

export default function Videochat() {
  // Read session details from URL parameters or use defaults
  const params = new URLSearchParams(window.location.search);
  const session = params.get("session") || "TestOne";
  const userName = params.get("userName") || "ekaansh";

  // Allow custom JWT via URL parameter (for testing error scenarios)
  const customJwt = params.get("jwt");

  // Generate JWT for the session (or use custom JWT if provided)
  const jwt = useMemo(() => {
    return customJwt || generateSignature(session, 1);
  }, [session, customJwt]);

  const { isInSession, error, isLoading } = useSession(session, jwt, userName);
  const { isVideoOn, toggleVideo } = useVideoState();
  const { isAudioMuted, toggleMute } = useAudioState();
  const users = useSessionUsers();

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0" data-testid="session-status">
        {isLoading && "loading"} {session} {isInSession && "joined"}{" "}
        {error && JSON.stringify(error)}
      </h1>
      <div
        className="flex w-full flex-1 flex-col"
        style={isInSession ? {} : { display: "none" }}
        data-testid="video-container"
      >
        <VideoPlayerContainerComponent>
          {users.map((user) => (
            <VideoPlayerComponent key={user.userId} user={user} />
          ))}
        </VideoPlayerContainerComponent>
      </div>
      {!isInSession ? (
        <div className="self-center text-xl text-center" data-testid="session-ended">
          {isLoading ? "loading..." : "session ended"}
        </div>
      ) : (
        <div className="flex w-full flex-col justify-around self-center" data-testid="controls">
          <div className="mt-4 flex w-[30rem] flex-1 justify-around self-center rounded-md bg-white p-4">
            <button
              type="button"
              onClick={() => void toggleVideo()}
              title="toggle video"
              data-testid="video-toggle"
            >
              {isVideoOn ? "mute video" : "unmute video"}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              title="toggle audio"
              data-testid="audio-toggle"
            >
              {isAudioMuted ? "unmute audio" : "mute audio"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
