import { useMemo, useState } from "react";
import { generateSignature } from "./JWT";
import { VideoPlayerComponent, useSession, useSessionUsers, useVideoState, useAudioState, VideoPlayerContainerComponent, useScreenshare, useScreenShareUsers, LocalScreenShareComponent, useMyself, ScreenShareContainerComponent, ScreenSharePlayerComponent } from "../../src";
import React from "react";
import ZoomVideo, { SharePrivilege } from "@zoom/videosdk";

export default function Videochat() {
  const [session, setSession] = useState("2");
  const jwt = useMemo(() => generateSignature(session, 1), [session]);
  const { isInSession, error, isLoading } = useSession(session, jwt, userName, undefined, 40, { initOptions: { webEndpoint: "" }, videoOptions: { virtualBackground: { imageUrl: "blur" } } });
  const { isVideoOn, toggleVideo } = useVideoState();
  const { isAudioMuted, toggleMute } = useAudioState();
  const users = useSessionUsers();
  const { ScreenshareRef, startScreenshare } = useScreenshare();
  const screenshareusers = useScreenShareUsers();

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0">
        {isLoading && "loading"} {session} {isInSession && "joined"} {error && JSON.stringify(error)}
      </h1>
      <button type="button" onClick={() => { setSession((parseInt(session) + 1).toString()) }} disabled={isLoading} className="w-64 self-center">
        Next session
      </button>
      <button onClick={async () => {
        const client = ZoomVideo.createClient();
        const mediaStream = client.getMediaStream();
        await mediaStream.setSharePrivilege(SharePrivilege.MultipleShare);
        startScreenshare({ simultaneousShareView: true })
      }} type="button" className="w-64 self-center mt-2">start screenshare</button>
      <div className="flex w-full flex-1 flex-col" style={isInSession ? {} : { display: "none" }}>
        <VideoPlayerContainerComponent>
          {users.map((user) => (
            <VideoPlayerComponent key={user.userId} user={user} />
          ))}
        </VideoPlayerContainerComponent>
        <ScreenShareContainerComponent>
          {screenshareusers.map((userId) => (
            <ScreenSharePlayerComponent key={userId} userId={userId} />
          ))}
        </ScreenShareContainerComponent>
        <LocalScreenShareComponent ref={ScreenshareRef} />
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
