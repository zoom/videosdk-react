import { generateSignature } from "../src/JWT";
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
import React, { useMemo, useState } from "react";
import ZoomVideo, { SharePrivilege } from "@zoom/videosdk";

export default function Videochat() {
  const params = new URLSearchParams(window.location.search);
  const initialSession = params.get("session") || "3222";
  const userName = params.get("userName") || "ekaansh";

  const [session, setSession] = useState(initialSession);
  const jwt = useMemo(() => generateSignature(session, 1), [session]);
  const { isInSession, error, isLoading } = useSession(session, jwt, userName, undefined, 40, {
    initOptions: { webEndpoint: "" },
    videoOptions: { virtualBackground: { imageUrl: "blur" } },
  });
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
        {isScreensharing && "Screensharing"} {error && JSON.stringify(error)}
      </h1>
      <button
        type="button"
        onClick={() => {
          setSession((parseInt(session) + 1).toString());
        }}
        disabled={isLoading}
        className="w-64 self-center"
      >
        Next session
      </button>
      <button
        onClick={async () => {
          const client = ZoomVideo.createClient();
          const mediaStream = client.getMediaStream();
          await mediaStream.setSharePrivilege(SharePrivilege.MultipleShare);
          startScreenshare({ simultaneousShareView: true });
        }}
        type="button"
        className="w-64 self-center mt-2"
      >
        start screenshare
      </button>
      <div
        className="flex w-full flex-1 flex-col"
        style={isInSession ? {} : { display: "none" }}
        key={session}
      >
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
        <div className="self-center text-xl text-center">
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
