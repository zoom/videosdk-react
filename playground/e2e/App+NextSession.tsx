import { useMemo, useState } from "react";
import { generateSignature } from "../src/JWT";
import {
  VideoPlayerComponent,
  useSession,
  useSessionUsers,
  useVideoState,
  useAudioState,
  VideoPlayerContainerComponent,
} from "../../src";
import React from "react";

export default function Videochat() {
  // Read initial session and userName from URL parameters or use defaults
  const params = new URLSearchParams(window.location.search);
  const initialSession = params.get("session") || "3222";
  const userName = params.get("userName") || "ekaansh";
  const jwtFromUrl = params.get("jwt");

  const [session, setSession] = useState(initialSession);
  const jwt = useMemo(() => {
    // If JWT is provided via URL, use it; otherwise generate one
    return jwtFromUrl || generateSignature(session, 1);
  }, [session, jwtFromUrl]);
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
      <button
        type="button"
        onClick={() => {
          setSession((parseInt(session) + 1).toString());
        }}
        disabled={isLoading}
        className="w-64 self-center"
        data-testid="next-session"
      >
        Next session
      </button>
      <div data-testid="users-list">{JSON.stringify(users)}</div>
      <div
        className="flex w-full flex-1 flex-col"
        style={isInSession ? {} : { display: "none" }}
        data-testid="video-container"
      >
        <VideoPlayerContainerComponent key={session}>
          {users.map((user) => (
            <VideoPlayerComponent key={`${session}-${user.userId}`} user={user} />
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
