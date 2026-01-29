import { generateSignature } from "./JWT";
import {
  VideoPlayerComponent,
  useSession,
  useSessionUsers,
  useVideoState,
  useAudioState,
  VideoPlayerContainerComponent,
} from "../../src";
import React from "react";

const session = "TestOne";
const jwt = generateSignature(session, 1);

export default function Videochat() {
  const { isInSession, error, isLoading } = useSession(session, jwt, userName);
  const { isVideoOn, toggleVideo } = useVideoState();
  const { isAudioMuted, toggleMute } = useAudioState();
  const users = useSessionUsers();

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0" data-testid="session-status">
        {isLoading && "loading"} {session} {isInSession && "joined"}{" "}
        {error && error.reason}
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

const userName = "ekaansh";
