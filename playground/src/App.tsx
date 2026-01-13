import { generateSignature } from "./JWT";
import { VideoPlayerComponent, useSession, useSessionUsers, useVideoState, useAudioState, VideoPlayerContainerComponent, useScreenshare, useScreenShareUsers, LocalScreenShareComponent, useMyself, ScreenShareContainerComponent, ScreenSharePlayerComponent } from "../../src";
import React, { useMemo } from "react";

const session = "TestOne";
const jwt = generateSignature(session, 1);

export default function Videochat() {
  const { isInSession, error, isLoading } = useSession(session, jwt, userName);
  const { isVideoOn, toggleVideo } = useVideoState();
  const { isAudioMuted, toggleMute } = useAudioState();
  const users = useSessionUsers();

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0">
        {isLoading && "loading"} {session} {isInSession && "joined"} {error && JSON.stringify(error)}
      </h1>
      <div className="flex w-full flex-1 flex-col" style={isInSession ? {} : { display: "none" }}>
        <VideoPlayerContainerComponent>
          {users.map((user) => (
            <VideoPlayerComponent key={user.userId} user={user} />
          ))}
        </VideoPlayerContainerComponent>
      </div>
      {!isInSession ? (
        <div className="self-center text-xl text-center">{isLoading ? "loading..." : "session ended"}</div>
      ) : (
        <div className="flex w-full flex-col justify-around self-center">
          <div className="mt-4 flex w-[30rem] flex-1 justify-around self-center rounded-md bg-white p-4">
            <button type="button" onClick={() => void toggleVideo()} title="toggle video">
              {isVideoOn ? "mute video" : "unmute video"}
            </button>
            <button type="button" onClick={toggleMute} title="toggle audio">
              {isAudioMuted ? "unmute audio" : "mute audio"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const userName = "ekaansh";
