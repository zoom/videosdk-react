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
  ScreenShareContainerComponent,
  ScreenSharePlayerComponent,
} from "../../src";
import React from "react";

const session = "TestOne";
const jwt = generateSignature(session, 1);

export default function Videochat() {
  const { isInSession, error, isLoading } = useSession(session, jwt, "ekaansh");
  const { isVideoOn, toggleVideo } = useVideoState();
  const { isAudioMuted, toggleMute } = useAudioState();
  const users = useSessionUsers();
  const { ScreenshareRef, startScreenshare, isScreensharing, stopScreenshare } = useScreenshare();
  const screenshareUsers = useScreenShareUsers();

  const handleScreenshareToggle = async () => {
    if (isScreensharing) {
      void stopScreenshare();
    } else {
      startScreenshare();
    }
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0" data-testid="session-status">
        {isLoading && "loading"} {session} {isInSession && "joined"}{" "}
        {error && JSON.stringify(error)}
      </h1>
      <div
        className="flex w-full flex-1 flex-col"
        style={isInSession ? {} : { display: "none" }}
        key={session}
        data-testid="video-container"
      >
        {isScreensharing ? <div className="">Screensharing Active</div> : <></>}
        <VideoPlayerContainerComponent>
          {users.map((user) => (
            <VideoPlayerComponent key={`${session}-${user.userId}`} user={user} />
          ))}
        </VideoPlayerContainerComponent>
        <ScreenShareContainerComponent>
          {screenshareUsers.map((userId) => (
            <ScreenSharePlayerComponent key={`${session}-${userId}`} userId={userId} />
          ))}
        </ScreenShareContainerComponent>
        <LocalScreenShareComponent ref={ScreenshareRef} />
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
            <button
              type="button"
              onClick={() => void handleScreenshareToggle()}
              title="toggle screenshare"
              data-testid="screenshare-toggle"
            >
              {isScreensharing ? "stop screenshare" : "start screenshare"}
            </button>
          </div>
          <div className="mt-2 text-center text-sm" data-testid="screenshare-status">
            Screenshare users: {screenshareUsers.length}
          </div>
        </div>
      )}
    </div>
  );
}
